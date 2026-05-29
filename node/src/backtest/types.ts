// ─────────────────────────────────────────────────────────────
// backtest/types.ts — Type definitions for the backtest engine
// ─────────────────────────────────────────────────────────────

/** A single OHLCV candle bar. */
export interface Candle {
  date: string;   // ISO date string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** The user's current portfolio state, passed into the strategy on each bar. */
export interface Portfolio {
  /** Remaining cash balance. */
  cash: number;
  /** Number of shares currently held (0 when flat). */
  shares: number;
  /** Current position direction. */
  direction: 'LONG' | 'SHORT' | 'FLAT';
  /** Average entry price of the current position (0 when flat). */
  avgEntryPrice: number;
  /** Total equity = cash + (shares × current price). */
  equity: number;
  /** Unrealized P&L for the open position. */
  unrealizedPnl: number;
}

/** MACD indicator result. */
export interface MACDResult {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

/** Bollinger Bands indicator result. */
export interface BollingerBandsResult {
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

/** Stochastic oscillator result. */
export interface StochasticResult {
  k: number | null;
  d: number | null;
}

/**
 * Indicator helpers injected into the strategy function.
 * Each call computes the indicator value at the *current* bar index.
 *
 * TODO: Replace dummy implementations with real calculations.
 */
export interface Indicators {
  /** Simple Moving Average over `period` bars. */
  sma(period: number): number | null;
  /** Exponential Moving Average over `period` bars. */
  ema(period: number): number | null;
  /** Relative Strength Index over `period` bars (0–100). */
  rsi(period: number): number | null;
  /** MACD with default (12, 26, 9) periods. */
  macd(fast?: number, slow?: number, signal?: number): MACDResult;
  /** Bollinger Bands with default (20, 2) parameters. */
  bollingerBands(period?: number, stdDev?: number): BollingerBandsResult;
  /** Average True Range over `period` bars. */
  atr(period: number): number | null;
  /** Volume-Weighted Average Price for the current session. */
  vwap(): number | null;
  /** Stochastic oscillator (%K, %D). */
  stochastic(kPeriod?: number, dPeriod?: number): StochasticResult;
  /** Rate of Change over `period` bars (percentage). */
  roc(period: number): number | null;
  /** Returns true if series `a` just crossed above series `b`. */
  crossover(a: number[], b: number[]): boolean;
  /** Returns true if series `a` just crossed below series `b`. */
  crossunder(a: number[], b: number[]): boolean;
}

/** The signal a strategy function must return. */
export type Signal = 'BUY' | 'SELL' | 'HOLD';

/**
 * Strategy function signature.
 *
 * The user writes this function — it receives market context and
 * must return a trading signal.
 */
export type StrategyFn = (
  candle: Candle,
  index: number,
  allCandles: Candle[],
  portfolio: Portfolio,
  indicators: Indicators,
) => Signal;

/** Historical data fetch options, forwarded to the quote API. */
export interface HistoricalOptions {
  /** Time period of data, e.g. '1y', '6m', '3m'. */
  period: string;
  /** Candle interval, e.g. '1d', '1h', '15m'. */
  interval: string;
}

/** Configuration for a backtest run. */
export interface BacktestOptions {
  /** Stock symbol to test, e.g. 'RELIANCE'. */
  symbol: string;
  /** Exchange (default: 'NSE'). */
  exchange?: string;
  /** Starting capital in ₹. */
  capitalAmount: number;
  /** Per-trade commission fee (default: 0). */
  commission?: number;
  /** How much historical data to fetch. */
  historicalOptions: HistoricalOptions;
}

/** A single trade executed by the engine. */
export interface Trade {
  /** ISO date when the trade was executed. */
  date: string;
  /** 'BUY' or 'SELL'. */
  type: 'BUY' | 'SELL';
  /** Execution price. */
  price: number;
  /** Number of shares traded. */
  shares: number;
  /** Realized profit/loss from closing a position (0 for opening trades). */
  pnl: number;
  /** Commission paid on this trade. */
  commission: number;
}

/** A single point on the equity curve. */
export interface EquityPoint {
  date: string;
  equity: number;
}

/** The complete backtest result returned to the user. */
export interface BacktestResult {
  // ── Summary stats ──
  /** Total return as a percentage. */
  totalReturn: number;
  /** Total number of trades executed. */
  totalTrades: number;
  /** Number of winning (profitable) trades. */
  winningTrades: number;
  /** Win rate as a percentage. */
  winRate: number;
  /** Maximum drawdown as a negative percentage. */
  maxDrawdown: number;
  /** Annualized Sharpe ratio. */
  sharpeRatio: number;
  /** Profit factor = gross profit / gross loss. */
  profitFactor: number;

  // ── Capital ──
  /** Starting capital. */
  initialCapital: number;
  /** Final portfolio equity. */
  finalEquity: number;

  // ── Detailed data ──
  /** Full list of executed trades. */
  trades: Trade[];
  /** Equity curve for charting. */
  equityCurve: EquityPoint[];
  /** Raw OHLCV candles used in the backtest. */
  candles: Candle[];

  // ── Metadata ──
  /** Symbol that was tested. */
  symbol: string;
  /** Exchange used. */
  exchange: string;
}
