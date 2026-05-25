import { createHttpConfig } from './http';
import { getQuote, batchQuote } from './quote';
import { searchInstruments } from './search';
// import { getHistorical } from './historical';

import {
  StockEyesConfig,
  Quote,
  SearchResult,
  // HistoricalData,
  // HistoricalOptions,
  BatchQuoteResult,
} from './types';

const DEFAULT_HOST = 'indian-stock-market-data-nse-bse-bcd-mcx-cds-nfo.p.rapidapi.com/v1';


interface SearchOptions {
  limit?: number;
  offset?: number;
}


export interface StockEyesClient {
  quote(symbol: string, exchange?: string): Promise<Quote>;
  batchQuote(symbols: string[], exchange?: string): Promise<BatchQuoteResult>;
  search(term: string, options?: SearchOptions): Promise<SearchResult>;
  // historical(symbol: string, options?: HistoricalOptions): Promise<HistoricalData>;
}

export function useStockEyes(config: StockEyesConfig): StockEyesClient {
  if (!config.apiKey) throw new Error('[StockEyes] apiKey is required');

  const host = config.host ?? DEFAULT_HOST;
  const httpConfig = createHttpConfig(config.apiKey, host);

  return {
    quote: (symbol, exchange = 'NSE') => getQuote(httpConfig, symbol, exchange),
    batchQuote: (symbols, exchange = 'NSE') => batchQuote(httpConfig, symbols, exchange),
    search: (term, options) => searchInstruments(httpConfig, term, options),
    // historical: (symbol, options) => getHistorical(httpConfig, symbol, options),
  };
}


export default useStockEyes;


export * from './types';
