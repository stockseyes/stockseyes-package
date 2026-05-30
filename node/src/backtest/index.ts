// ─────────────────────────────────────────────────────────────
// backtest/index.ts — Barrel exports for the backtest module
// ─────────────────────────────────────────────────────────────
//
// Re-exports all public types, the engine runner, and the
// CSV / chart output utilities.
//

export { runBacktest } from './engine';
export { exportBacktestCSV } from './csv';
export { generateBacktestChart } from './chart';
export type {
  Candle,
  Portfolio,
  Indicators,
  MACDResult,
  BollingerBandsResult,
  StochasticResult,
  Signal,
  StrategyFn,
  HistoricalOptions,
  BacktestOptions,
  Trade,
  EquityPoint,
  BacktestResult,
} from './types';
