import { getQuote, batchQuote } from './quote';
import { searchInstruments } from './search';
import { runBacktest } from './backtest';
import {
  StockEyesConfig,
  HttpConfig,
  Quote,
  SearchResult,
  BatchQuoteResult,
  SearchOptions,
} from './types';
import type { StrategyFn, BacktestOptions, BacktestResult } from './backtest';

const DEFAULT_HOST =
  'indian-stock-market-data-nse-bse-bcd-mcx-cds-nfo.p.rapidapi.com';
const DEFAULT_TIMEOUT_MS = 10_000;

export interface StockEyesClient {
  quote(symbol: string, exchange?: string): Promise<Quote>;
  batchQuote(symbols: string[], exchange?: string): Promise<BatchQuoteResult>;
  search(term: string, options?: SearchOptions): Promise<SearchResult>;

  /**
   * Run a backtest of your trading strategy against historical data.
   *
   * @param strategy - Your strategy function that receives candle data,
   *                   portfolio state, and indicators, and returns 'BUY' | 'SELL' | 'HOLD'.
   * @param options  - Backtest configuration (symbol, capital, historical data options).
   * @returns        - Complete BacktestResult with stats, trades, equity curve, and raw candles.
   *
   * @example
   * ```ts
   * const result = await client.backtestStrategy(myStrategy, {
   *   symbol: 'RELIANCE',
   *   capitalAmount: 500000,
   *   historicalOptions: { period: '1y', interval: '1d' },
   * });
   * console.log(`Return: ${result.totalReturn}%`);
   * ```
   */
  backtestStrategy(
    strategy: StrategyFn,
    options: BacktestOptions
  ): Promise<BacktestResult>;
}

export function useStockEyes(config: StockEyesConfig): StockEyesClient {
  if (!config.apiKey) throw new Error('[StockEyes] apiKey is required');

  const host = config.host ?? DEFAULT_HOST;
  const httpConfig: HttpConfig = {
    apiKey: config.apiKey,
    host,
    baseURL: config.baseUrl ?? `https://${host}/v1`,
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };

  return {
    quote: (symbol, exchange = 'NSE') => getQuote(httpConfig, symbol, exchange),
    batchQuote: (symbols, exchange = 'NSE') =>
      batchQuote(httpConfig, symbols, exchange),
    search: (term, options) => searchInstruments(httpConfig, term, options),
    backtestStrategy: (strategy, options) =>
      runBacktest(httpConfig, strategy, options),
  };
}

export default useStockEyes;

// ── Existing exports ──
export { StockEyesError, isStockEyesError } from './http';
export type { StockEyesErrorCode } from './http';
export * from './types';

// ── Backtest exports ──
// Standalone utilities (can be used without the client)
export { exportBacktestCSV } from './backtest';
export { generateBacktestChart } from './backtest';

// Re-export all backtest types for consumer use
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
} from './backtest';
