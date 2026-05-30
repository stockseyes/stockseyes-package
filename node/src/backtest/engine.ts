// ─────────────────────────────────────────────────────────────
// backtest/engine.ts — Core backtest engine (DEMO / SHELL)
// ─────────────────────────────────────────────────────────────
//
// This is the heart of the backtest system. It:
//   1. Fetches historical candle data (TODO — currently uses dummy data)
//   2. Iterates through each candle
//   3. Computes indicators and calls the user's strategy
//   4. Executes trades based on the returned signal
//   5. Computes summary statistics
//
// All trade execution and stats are DEMO implementations that
// return realistic-looking dummy data. Replace with real logic.
//

import type { HttpConfig } from '../types';
import type {
  StrategyFn,
  BacktestOptions,
  BacktestResult,
  Candle,
  Trade,
  EquityPoint,
  Portfolio,
} from './types';
import { createIndicators } from './indicators';

// ── Dummy data generator ──────────────────────────────────────

/**
 * Generate fake OHLCV candle data for demo purposes.
 *
 * TODO: Replace with actual API call to fetch historical data
 *       using the httpConfig and historicalOptions.
 *
 * @param symbol   - Stock symbol (used in dummy data metadata)
 * @param options  - Backtest options containing period/interval
 * @returns        - Array of dummy Candle objects
 */
function generateDummyCandles(
  _symbol: string,
  _options: BacktestOptions
): Candle[] {
  const candles: Candle[] = [];
  const startDate = new Date('2025-05-26');
  let price = 2500; // Starting price for demo

  // Generate ~252 trading days (1 year)
  for (let i = 0; i < 252; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Skip weekends in demo data
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    // Random walk with slight upward bias
    const change = (Math.random() - 0.48) * price * 0.02;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * price * 0.005;
    const low = Math.min(open, close) - Math.random() * price * 0.005;
    const volume = Math.floor(1_000_000 + Math.random() * 2_000_000);

    candles.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });

    price = close;
  }

  return candles;
}

// ── Portfolio helpers ─────────────────────────────────────────

/**
 * Create the initial portfolio state.
 *
 * TODO: This shape is correct; no changes needed for real impl.
 */
function createInitialPortfolio(capital: number): Portfolio {
  return {
    cash: capital,
    shares: 0,
    direction: 'FLAT',
    avgEntryPrice: 0,
    equity: capital,
    unrealizedPnl: 0,
  };
}

/**
 * Execute a BUY signal — opens a LONG or closes a SHORT.
 *
 * TODO: Implement real position sizing, commission deduction,
 *       and P&L calculation.
 */
function executeBuy(
  portfolio: Portfolio,
  price: number,
  commission: number
): { updatedPortfolio: Portfolio; trade: Trade | null } {
  if (portfolio.direction === 'LONG') {
    // Already long — signal ignored
    return { updatedPortfolio: portfolio, trade: null };
  }

  if (portfolio.direction === 'SHORT') {
    // Close short position — realize P&L
    // TODO: Calculate real P&L = (avgEntryPrice - price) * shares
    const pnl = (portfolio.avgEntryPrice - price) * portfolio.shares;
    const trade: Trade = {
      date: '', // filled by caller
      type: 'BUY',
      price,
      shares: portfolio.shares,
      pnl: Math.round(pnl * 100) / 100,
      commission,
    };
    return {
      updatedPortfolio: {
        cash: portfolio.cash + pnl - commission,
        shares: 0,
        direction: 'FLAT',
        avgEntryPrice: 0,
        equity: portfolio.cash + pnl - commission,
        unrealizedPnl: 0,
      },
      trade,
    };
  }

  // FLAT → open LONG position
  // TODO: shares = floor(cash / price), deduct commission
  const shares = Math.floor(portfolio.cash / price);
  const cost = shares * price + commission;
  const trade: Trade = {
    date: '', // filled by caller
    type: 'BUY',
    price,
    shares,
    pnl: 0, // opening trade has no realized P&L
    commission,
  };
  return {
    updatedPortfolio: {
      cash: portfolio.cash - cost,
      shares,
      direction: 'LONG',
      avgEntryPrice: price,
      equity: portfolio.cash, // stays the same at entry
      unrealizedPnl: 0,
    },
    trade,
  };
}

/**
 * Execute a SELL signal — opens a SHORT or closes a LONG.
 *
 * TODO: Implement real position sizing, commission deduction,
 *       and P&L calculation.
 */
function executeSell(
  portfolio: Portfolio,
  price: number,
  commission: number
): { updatedPortfolio: Portfolio; trade: Trade | null } {
  if (portfolio.direction === 'SHORT') {
    // Already short — signal ignored
    return { updatedPortfolio: portfolio, trade: null };
  }

  if (portfolio.direction === 'LONG') {
    // Close long position — realize P&L
    // TODO: Calculate real P&L = (price - avgEntryPrice) * shares
    const pnl = (price - portfolio.avgEntryPrice) * portfolio.shares;
    const trade: Trade = {
      date: '', // filled by caller
      type: 'SELL',
      price,
      shares: portfolio.shares,
      pnl: Math.round(pnl * 100) / 100,
      commission,
    };
    return {
      updatedPortfolio: {
        cash: portfolio.cash + portfolio.shares * price - commission,
        shares: 0,
        direction: 'FLAT',
        avgEntryPrice: 0,
        equity: portfolio.cash + portfolio.shares * price - commission,
        unrealizedPnl: 0,
      },
      trade,
    };
  }

  // FLAT → open SHORT position
  // TODO: shares = floor(cash / price), credit sale proceeds
  const shares = Math.floor(portfolio.cash / price);
  const proceeds = shares * price - commission;
  const trade: Trade = {
    date: '', // filled by caller
    type: 'SELL',
    price,
    shares,
    pnl: 0,
    commission,
  };
  return {
    updatedPortfolio: {
      cash: portfolio.cash + proceeds,
      shares,
      direction: 'SHORT',
      avgEntryPrice: price,
      equity: portfolio.cash,
      unrealizedPnl: 0,
    },
    trade,
  };
}

// ── Stats computation ─────────────────────────────────────────

/**
 * Compute summary statistics from the equity curve and trades.
 *
 * TODO: Replace with real calculations for:
 *  - maxDrawdown (peak-to-trough)
 *  - sharpeRatio (annualized risk-adjusted return)
 *  - profitFactor (gross profit / gross loss)
 */
function computeStats(
  initialCapital: number,
  finalEquity: number,
  trades: Trade[],
  _equityCurve: EquityPoint[]
): {
  totalReturn: number;
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
} {
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.pnl > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalReturn =
    ((finalEquity - initialCapital) / initialCapital) * 100;

  // TODO: Compute real max drawdown from equity curve peaks/troughs
  const maxDrawdown = -8.3; // DEMO placeholder

  // TODO: Compute real Sharpe ratio from daily returns
  const sharpeRatio = 1.45; // DEMO placeholder

  // TODO: Compute real profit factor
  const grossProfit = trades
    .filter((t) => t.pnl > 0)
    .reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(
    trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0)
  );
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  return {
    totalReturn: Math.round(totalReturn * 100) / 100,
    totalTrades,
    winningTrades,
    winRate: Math.round(winRate * 100) / 100,
    maxDrawdown,
    sharpeRatio,
    profitFactor: Math.round(profitFactor * 100) / 100,
  };
}

// ── Main engine ───────────────────────────────────────────────

/**
 * Run a backtest with the user's strategy against historical data.
 *
 * This is the main entry point called by `client.backtestStrategy()`.
 *
 * TODO:
 *  - Replace generateDummyCandles() with a real historical data fetch
 *  - Wire up real trade execution with slippage/commission models
 *  - Compute real statistics
 *
 * @param _httpConfig - HTTP config for fetching historical data (unused in demo)
 * @param strategy    - The user's strategy function
 * @param options     - Backtest configuration (symbol, capital, etc.)
 * @returns           - Complete BacktestResult with stats, trades, and charts
 */
export async function runBacktest(
  _httpConfig: HttpConfig,
  strategy: StrategyFn,
  options: BacktestOptions
): Promise<BacktestResult> {
  const exchange = options.exchange ?? 'NSE';
  const commission = options.commission ?? 0;

  // ── Step 1: Get historical candle data ──
  // TODO: Fetch real data from the API using httpConfig
  const candles = generateDummyCandles(options.symbol, options);

  // ── Step 2: Initialize portfolio ──
  let portfolio = createInitialPortfolio(options.capitalAmount);
  const trades: Trade[] = [];
  const equityCurve: EquityPoint[] = [];

  // ── Step 3: Iterate through each candle ──
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const candlesUpToNow = candles.slice(0, i + 1);

    // Build indicators scoped to the current bar
    const indicators = createIndicators(candlesUpToNow, i);

    // Call the user's strategy
    const signal = strategy(candle, i, candlesUpToNow, portfolio, indicators);

    // ── Step 4: Execute trades based on signal ──
    if (signal === 'BUY') {
      const result = executeBuy(portfolio, candle.close, commission);
      if (result.trade) {
        result.trade.date = candle.date;
        trades.push(result.trade);
      }
      portfolio = result.updatedPortfolio;
    } else if (signal === 'SELL') {
      const result = executeSell(portfolio, candle.close, commission);
      if (result.trade) {
        result.trade.date = candle.date;
        trades.push(result.trade);
      }
      portfolio = result.updatedPortfolio;
    }

    // ── Step 5: Update equity and record equity curve ──
    const currentEquity =
      portfolio.direction === 'FLAT'
        ? portfolio.cash
        : portfolio.cash + portfolio.shares * candle.close;

    portfolio.equity = currentEquity;
    portfolio.unrealizedPnl =
      portfolio.direction === 'LONG'
        ? (candle.close - portfolio.avgEntryPrice) * portfolio.shares
        : portfolio.direction === 'SHORT'
          ? (portfolio.avgEntryPrice - candle.close) * portfolio.shares
          : 0;

    equityCurve.push({ date: candle.date, equity: currentEquity });
  }

  // ── Step 6: Compute summary stats ──
  const finalEquity = equityCurve.length > 0
    ? equityCurve[equityCurve.length - 1].equity
    : options.capitalAmount;

  const stats = computeStats(
    options.capitalAmount,
    finalEquity,
    trades,
    equityCurve
  );

  return {
    ...stats,
    initialCapital: options.capitalAmount,
    finalEquity,
    trades,
    equityCurve,
    candles,
    symbol: options.symbol,
    exchange,
  };
}
