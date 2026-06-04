import { getQuote, batchQuote } from './quote';
import { searchInstruments } from './search';
import { getCandles } from './candles';
import {
  StockEyesConfig,
  HttpConfig,
  Quote,
  SearchResult,
  BatchQuoteResult,
  SearchOptions,
  Candle,
  CandleQuery,
} from './types';

const DEFAULT_HOST =
  'indian-stock-market-data-nse-bse-bcd-mcx-cds-nfo.p.rapidapi.com';
const DEFAULT_TIMEOUT_MS = 10_000;

export interface StockEyesClient {
  quote(symbol: string, exchange?: string): Promise<Quote>;
  batchQuote(symbols: string[], exchange?: string): Promise<BatchQuoteResult>;
  search(term: string, options?: SearchOptions): Promise<SearchResult>;
  /**
   * Fetch a historical OHLC candle series for an instrument over a date range.
   * Backed by a deterministic mock data source until the upstream route ships.
   */
  candles(query: CandleQuery): Promise<Candle[]>;
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
    candles: (query) => getCandles(httpConfig, query),
  };
}

export default useStockEyes;

export { StockEyesError, isStockEyesError } from './http';
export type { StockEyesErrorCode } from './http';
export * from './types';
