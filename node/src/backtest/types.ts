import type { BarInterval, Candle } from '../types';

export type { BarInterval, Candle };

// ---- Strategy authoring surface ----

/** A read-only view of the current open position (long-only in v1). */
export interface Position {
  /** True when a position is currently held. */
  readonly isOpen: boolean;
  /** Share count held (0 when flat). */
  readonly quantity: number;
  /** Volume-weighted average entry price, or 0 when flat. */
  readonly avgPrice: number;
  /** Mark-to-market value at the current bar's close. */
  readonly marketValue: number;
  /** Unrealized P&L at the current bar's close. */
  readonly unrealizedPnl: number;
  /** Bars elapsed since the position was opened. */
  readonly barsHeld: number;
}

/** Lookback views. All arrays are newest-first: index 0 is the current bar. */
export interface Series {
  closes(lookback?: number): number[];
  opens(lookback?: number): number[];
  highs(lookback?: number): number[];
  lows(lookback?: number): number[];
  volumes(lookback?: number): number[];
  candles(lookback?: number): Candle[];
}

/**
 * Technical indicators evaluated at the current bar. Each returns `undefined`
 * during warm-up (not enough history) — handle it explicitly.
 */
export interface Indicators {
  /** Simple moving average of close over `period`. */
  sma(period: number): number | undefined;
  /** Exponential moving average of close over `period`. */
  ema(period: number): number | undefined;
  /** Relative Strength Index over `period` (default 14). 0–100. */
  rsi(period?: number): number | undefined;
  /** Population standard deviation of close over `period`. */
  stdev(period: number): number | undefined;
  /** Highest high over `period`. */
  highest(period: number): number | undefined;
  /** Lowest low over `period`. */
  lowest(period: number): number | undefined;
  /** Escape hatch: run your own function over the close series (newest-first). */
  custom<T>(fn: (closes: number[]) => T): T;
}

export type OrderSide = 'buy' | 'sell';

/** An executed order (a single fill). */
export interface Order {
  side: OrderSide;
  quantity: number;
  /** Price the order actually filled at (after slippage). */
  fillPrice: number;
  commission: number;
  timestamp: Date;
  barIndex: number;
}

/** The object handed to a strategy on every bar. */
export interface BacktestContext {
  /** The just-closed bar being processed. */
  readonly bar: Candle;
  /** 0-based index of the current bar. */
  readonly index: number;
  readonly symbol: string;
  readonly series: Series;
  readonly indicator: Indicators;
  /** Free cash available to deploy. */
  readonly cash: number;
  /** cash + position market value at the current bar's close. */
  readonly equity: number;
  readonly position: Position;
  /**
   * Go long. `qty` omitted → engine applies `config.positionSizing`. Returns the
   * fill, or `null` if it could not fill now (e.g. queued under `next-open`, or
   * insufficient cash).
   */
  buy(qty?: number): Order | null;
  /** Reduce/close the long. `qty` omitted → sell the entire position. */
  sell(qty?: number): Order | null;
  /** Flatten the position entirely. */
  close(): Order | null;
  /** Mutable scratch bag that persists across bars for this run. */
  state: Record<string, unknown>;
  /** Attach a labeled marker to the current bar (collected on the result). */
  log(message: string): void;
}

/** The single strategy contract the engine consumes. */
export interface Strategy {
  name?: string;
  /** One-time setup before the first bar. */
  init?: (ctx: BacktestContext) => void;
  /** Called once per bar in chronological order. */
  onBar: (ctx: BacktestContext) => void;
  /** Teardown after the last bar (e.g. liquidate open positions). */
  done?: (ctx: BacktestContext) => void;
}

// ---- Configuration ----

export type PositionSizing =
  /** Use N (0–1) of current equity. */
  | { type: 'percent-equity'; value: number }
  /** Fixed cash notional per entry. */
  | { type: 'fixed-cash'; value: number }
  /** Fixed share count per entry. */
  | { type: 'fixed-qty'; value: number };

export type Commission =
  /** Flat amount per trade. */
  | { type: 'flat'; value: number }
  /** Fraction of notional, e.g. 0.0003 = 3 bps. */
  | { type: 'percent'; value: number };

export type FillModel = 'close' | 'next-open';

/** A source of candles. The engine depends only on this, never on the live API. */
export interface DataFeed {
  readonly symbol: string;
  readonly interval?: BarInterval;
  /** Optional async priming (e.g. fetch candles) run once before iteration. */
  load?(): Promise<void>;
  /** Pull the next bar, or null when the series is exhausted. */
  next(): Candle | null;
  /** Reset to the beginning so the feed can be replayed. */
  reset(): void;
}

export interface BacktestConfig {
  /** Historical OHLCV — a `DataFeed` or a plain `Candle[]`. */
  feed: DataFeed | Candle[];
  strategy: Strategy;
  /** Label used in results when `feed` is a plain array. Default `ASSET`. */
  symbol?: string;
  /** Bar size used when `feed` is a plain array. */
  interval?: BarInterval;
  /** Starting account cash. Default 100_000. */
  initialCash?: number;
  /** Default sizing for `ctx.buy()` without an explicit qty. Default 100% equity. */
  positionSizing?: PositionSizing;
  /** Commission per trade. Default none. */
  commission?: Commission;
  /** Slippage as a fraction of price. Default 0. */
  slippage?: number;
  /** When orders fill. Default `next-open` (avoids look-ahead bias). */
  fillModel?: FillModel;
  /** Annualization basis for Sharpe/CAGR. Inferred from interval if omitted. */
  periodsPerYear?: number;
  /** Annual risk-free rate (decimal) for Sharpe/Sortino. Default 0. */
  riskFreeRate?: number;
}

// ---- Results ----

/** A completed round-trip (entry → exit). */
export interface Trade {
  entryTime: Date;
  entryPrice: number;
  exitTime: Date;
  exitPrice: number;
  quantity: number;
  /** Realized P&L, net of commission. */
  pnl: number;
  /** Return on the trade as a fraction (0.05 = +5%). */
  returnPct: number;
  barsHeld: number;
  commission: number;
}

export interface EquityPoint {
  timestamp: Date;
  equity: number;
  /** Peak-to-trough drawdown at this point, as a percentage (≤ 0). */
  drawdownPct: number;
}

export interface BacktestMetrics {
  initialCash: number;
  finalEquity: number;
  totalReturnPct: number;
  cagrPct: number;
  maxDrawdownPct: number;
  sharpe: number;
  sortino: number;
  winRatePct: number;
  /** Gross profit / gross loss; `null` when there are no losing trades. */
  profitFactor: number | null;
  avgTradePct: number;
  totalTrades: number;
  totalCommission: number;
  /** Fraction of bars (as %) with an open position. */
  exposurePct: number;
  /** Buy-and-hold return of the same series over the same window, as %. */
  buyHoldReturnPct: number;
  periodsPerYear: number;
}

/** The serialized contract shape — validates against spec `BacktestResult`. */
export interface BacktestResultJSON {
  symbol: string;
  interval: string;
  startTime: string;
  endTime: string;
  initialCash: number;
  metrics: BacktestMetrics;
  trades: Array<{
    entryTime: string;
    entryPrice: number;
    exitTime: string;
    exitPrice: number;
    quantity: number;
    pnl: number;
    returnPct: number;
    barsHeld: number;
    commission: number;
  }>;
  equityCurve: Array<{ timestamp: string; equity: number; drawdownPct: number }>;
}

/** A log line attached to a bar by `ctx.log()`. */
export interface LogEntry {
  index: number;
  timestamp: Date;
  message: string;
}

export interface BacktestResult {
  symbol: string;
  interval: string;
  startTime: Date;
  endTime: Date;
  initialCash: number;
  metrics: BacktestMetrics;
  trades: Trade[];
  orders: Order[];
  equityCurve: EquityPoint[];
  logs: LogEntry[];
  /** Serializable contract object (dates as ISO strings, numbers rounded). */
  toJSON(): BacktestResultJSON;
  /** Human-readable multi-line summary table. */
  toString(): string;
  /** `console.log(this.toString())`. */
  print(): void;
}

export interface Backtest {
  run(): Promise<BacktestResult>;
}
