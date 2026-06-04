import { StockEyesError } from '../http';
import type { BarInterval, Candle } from '../types';
import {
  BacktestConfig,
  BacktestContext,
  DataFeed,
  EquityPoint,
  Indicators,
  LogEntry,
  OrderSide,
  PositionSizing,
  Series,
} from './types';
import { createPortfolio } from './broker';
import { ema, highest, lowest, rsi, sma, stdev } from './indicators';
import { computeMetrics } from './metrics';
import { arrayDataFeed } from './feed';
import { buildResult } from './result';

const PERIODS_PER_YEAR: Record<BarInterval, number> = {
  '1d': 252,
  '1w': 52,
  '1h': 252 * 7,
  '15m': 252 * 7 * 4,
  '5m': 252 * 7 * 12,
  '1m': 252 * 7 * 60,
};

function sizeQty(sizing: PositionSizing, equity: number, price: number): number {
  if (price <= 0) return 0;
  switch (sizing.type) {
    case 'percent-equity':
      return Math.floor((equity * sizing.value) / price);
    case 'fixed-cash':
      return Math.floor(sizing.value / price);
    case 'fixed-qty':
      return Math.floor(sizing.value);
  }
}

/** Run a backtest to completion. Resolves with the structured result. */
export async function runEngine(config: BacktestConfig) {
  const initialCash = config.initialCash ?? 100_000;
  const sizing: PositionSizing =
    config.positionSizing ?? { type: 'percent-equity', value: 1 };
  const slippage = config.slippage ?? 0;
  const fillModel = config.fillModel ?? 'next-open';
  const riskFreeRate = config.riskFreeRate ?? 0;

  if (initialCash <= 0) {
    throw new StockEyesError('backtest: initialCash must be > 0', 'backtest');
  }

  // Resolve the feed (a plain array becomes an arrayDataFeed).
  const feed: DataFeed = Array.isArray(config.feed)
    ? arrayDataFeed(config.symbol ?? 'ASSET', config.feed, config.interval)
    : config.feed;

  await feed.load?.();
  feed.reset();

  // Drain the feed once (finite + buffered) so the loop can index and peek.
  const all: Candle[] = [];
  for (let c = feed.next(); c !== null; c = feed.next()) all.push(c);
  if (all.length === 0) {
    throw new StockEyesError('backtest: feed has no candles', 'backtest');
  }

  const interval = feed.interval;
  const periodsPerYear =
    config.periodsPerYear ?? (interval ? PERIODS_PER_YEAR[interval] : 252);

  // Precompute column arrays (chronological) for cheap indicator/series access.
  const opensArr = all.map((c) => c.open);
  const highsArr = all.map((c) => c.high);
  const lowsArr = all.map((c) => c.low);
  const closesArr = all.map((c) => c.close);
  const volumesArr = all.map((c) => c.volume);

  const portfolio = createPortfolio(initialCash, config.commission, slippage);
  const equityCurve: EquityPoint[] = [];
  const logs: LogEntry[] = [];
  const pending: Array<{ side: OrderSide; qty: number }> = [];
  let exposureBars = 0;

  // Mutable cursor the context closures read from.
  let curIndex = 0;
  let curBar = all[0];
  let lastEntryIndex = 0; // bar index of the most recent entry (for position.barsHeld)

  const newestFirst = (arr: number[], lookback?: number): number[] => {
    const end = curIndex + 1;
    const start = lookback ? Math.max(0, end - lookback) : 0;
    return arr.slice(start, end).reverse();
  };
  const closesUpTo = (): number[] => closesArr.slice(0, curIndex + 1);
  const highsUpTo = (): number[] => highsArr.slice(0, curIndex + 1);
  const lowsUpTo = (): number[] => lowsArr.slice(0, curIndex + 1);

  const series: Series = {
    closes: (n) => newestFirst(closesArr, n),
    opens: (n) => newestFirst(opensArr, n),
    highs: (n) => newestFirst(highsArr, n),
    lows: (n) => newestFirst(lowsArr, n),
    volumes: (n) => newestFirst(volumesArr, n),
    candles: (n) => {
      const end = curIndex + 1;
      const start = n ? Math.max(0, end - n) : 0;
      return all.slice(start, end).reverse();
    },
  };

  const indicator: Indicators = {
    sma: (p) => sma(closesUpTo(), p),
    ema: (p) => ema(closesUpTo(), p),
    rsi: (p) => rsi(closesUpTo(), p),
    stdev: (p) => stdev(closesUpTo(), p),
    highest: (p) => highest(highsUpTo(), p),
    lowest: (p) => lowest(lowsUpTo(), p),
    custom: (fn) => fn(series.closes()),
  };

  const placeBuy = (qty?: number) => {
    const equityNow = portfolio.equity(curBar.close);
    const q =
      qty !== undefined ? Math.floor(qty) : sizeQty(sizing, equityNow, curBar.close);
    if (q <= 0) return null;
    if (fillModel === 'close') {
      return portfolio.buy(q, curBar.close, curBar.timestamp, curIndex);
    }
    pending.push({ side: 'buy', qty: q });
    return null;
  };

  const placeSell = (qty?: number) => {
    const q = qty !== undefined ? Math.floor(qty) : portfolio.quantity;
    if (q <= 0) return null;
    if (fillModel === 'close') {
      return portfolio.sell(q, curBar.close, curBar.timestamp, curIndex);
    }
    pending.push({ side: 'sell', qty: q });
    return null;
  };

  const ctx: BacktestContext = {
    get bar() {
      return curBar;
    },
    get index() {
      return curIndex;
    },
    symbol: feed.symbol,
    series,
    indicator,
    get cash() {
      return portfolio.cash;
    },
    get equity() {
      return portfolio.equity(curBar.close);
    },
    get position() {
      const qty = portfolio.quantity;
      return {
        isOpen: qty > 0,
        quantity: qty,
        avgPrice: portfolio.avgPrice,
        marketValue: qty * curBar.close,
        unrealizedPnl: qty * (curBar.close - portfolio.avgPrice),
        barsHeld: qty > 0 ? curIndex - lastEntryIndex : 0,
      };
    },
    buy: placeBuy,
    sell: placeSell,
    close: () => placeSell(portfolio.quantity),
    state: {},
    log: (message: string) => {
      logs.push({ index: curIndex, timestamp: curBar.timestamp, message });
    },
  };

  const fillPending = (price: (c: Candle) => number) => {
    for (const o of pending) {
      if (o.side === 'buy') {
        const order = portfolio.buy(o.qty, price(curBar), curBar.timestamp, curIndex);
        if (order && portfolio.quantity === order.quantity) lastEntryIndex = curIndex;
      } else {
        portfolio.sell(o.qty, price(curBar), curBar.timestamp, curIndex);
      }
    }
    pending.length = 0;
  };

  for (let i = 0; i < all.length; i++) {
    curIndex = i;
    curBar = all[i];

    if (fillModel === 'next-open' && pending.length) {
      fillPending((c) => c.open);
    }

    if (i === 0) config.strategy.init?.(ctx);

    const qtyBefore = portfolio.quantity;
    config.strategy.onBar(ctx);
    if (fillModel === 'close' && qtyBefore === 0 && portfolio.quantity > 0) {
      lastEntryIndex = i;
    }

    if (i === all.length - 1) {
      config.strategy.done?.(ctx);
      if (fillModel === 'next-open' && pending.length) {
        fillPending((c) => c.close);
      }
    }

    if (portfolio.quantity > 0) exposureBars++;
    equityCurve.push({
      timestamp: curBar.timestamp,
      equity: portfolio.equity(curBar.close),
      drawdownPct: 0,
    });
  }

  const startTime = all[0].timestamp;
  const endTime = all[all.length - 1].timestamp;
  const firstClose = closesArr[0];
  const lastClose = closesArr[closesArr.length - 1];
  const buyHoldReturnPct =
    firstClose !== 0 ? (lastClose / firstClose - 1) * 100 : 0;
  const totalCommission = portfolio.orders.reduce((a, o) => a + o.commission, 0);

  const metrics = computeMetrics({
    equityCurve,
    trades: portfolio.trades,
    initialCash,
    startTime,
    endTime,
    periodsPerYear,
    riskFreeRate,
    exposureBars,
    totalBars: all.length,
    buyHoldReturnPct,
    totalCommission,
  });

  return buildResult({
    symbol: feed.symbol,
    interval: interval ?? 'unknown',
    startTime,
    endTime,
    initialCash,
    metrics,
    trades: portfolio.trades,
    orders: portfolio.orders,
    equityCurve,
    logs,
  });
}
