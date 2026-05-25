

export interface StockEyesConfig {
  apiKey: string;
  host?: string;
}


export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  marketCap: number | null;
  timestamp: Date;
  currency: string;
  exchange: string;
}


export interface Instrument {
  symbol: string;
  name: string;
  exchange: string;
  type: 'stock' | 'etf' | 'index' | 'crypto' | 'forex' | 'unknown';
  currency: string;
}

export interface SearchResult {
  query: string;
  results: Instrument[];
}



export type Interval = '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1wk' | '1mo';
export type Period   = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max';

export interface HistoricalOptions {
  period?: Period;
  interval?: Interval;
  from?: string; 
  to?: string;
}

export interface OHLCV {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

export interface HistoricalData {
  symbol: string;
  interval: Interval;
  period: Period | 'custom';
  candles: OHLCV[];
}


export type BatchQuoteResult = Record<string, Quote | { error: string }>;


export interface HttpConfig {
  apiKey: string;
  host: string;
  baseURL: string;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
}

export interface RawInstrument {
  instrument_token: number;
  exchange_token: string;
  tradingsymbol: string;
  name: string;
  last_price: string;
  expiry: string;
  strike: string;
  tick_size: string;
  lot_size: string;
  instrument_type: string;
  segment: string;
  exchange: string;
}

export interface RawSearchResponse {
  instruments: RawInstrument[];
  totalCount: number;
}

export interface RawQuote {
  tradingSymbol: string;
  exchange: string;
  lastPrice: number;
  change: number;
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  volumeTradedToday: number;
  timestamp: string; // ISO 8601 string
  marketCapInCrores: number | null;
  lowerCircuitLimit?: number;
  upperCircuitLimit?: number;
  lastTradedTime?: string;
  instrumentToken?: number;
  oi?: number;
  averagePrice?: number;
  buyQuantity?: number;
  sellQuantity?: number;
  depth?: Record<string, unknown>;
  error?: string | null;
}


