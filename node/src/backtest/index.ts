// Public entry for `@stockseyes/node/backtest` — an event-driven backtesting engine.
// Users write a single `onBar(ctx)` strategy and run it over a historical candle series.

import type { BacktestConfig, Backtest, BacktestResult } from './types';
import { runEngine } from './engine';

/**
 * Create a backtest. Mirrors the `useStockEyes(config)` factory idiom — returns a plain
 * handle with a `run()` method (no classes, no `new`).
 *
 * @example
 * const result = await createBacktest({
 *   feed: feedFromStockEyes(client, { symbol: 'RELIANCE', from, to, interval: '1d' }),
 *   strategy: {
 *     onBar: (ctx) => {
 *       const f = ctx.indicator.sma(20), s = ctx.indicator.sma(50);
 *       if (f === undefined || s === undefined) return;
 *       if (!ctx.position.isOpen && f > s) ctx.buy();
 *       else if (ctx.position.isOpen && f < s) ctx.close();
 *     },
 *   },
 * }).run();
 */
export function createBacktest(config: BacktestConfig): Backtest {
  return { run: () => runEngine(config) };
}

/** One-shot sugar: `createBacktest(config).run()`. */
export function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  return runEngine(config);
}

export { arrayDataFeed, feedFromStockEyes } from './feed';

// Re-export the candle types + client method shape from the core for convenience.
export type { Candle, CandleQuery, BarInterval } from '../types';

export type {
  Backtest,
  BacktestConfig,
  BacktestContext,
  BacktestMetrics,
  BacktestResult,
  BacktestResultJSON,
  Commission,
  DataFeed,
  EquityPoint,
  FillModel,
  Indicators,
  LogEntry,
  Order,
  OrderSide,
  Position,
  PositionSizing,
  Series,
  Strategy,
  Trade,
} from './types';
