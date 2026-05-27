export interface StockEyesConfig {
  /** RapidAPI key, sent as the `x-rapidapi-key` header. Required. */
  apiKey: string;
  /** Bare RapidAPI host (domain only, no path). Sent as the `x-rapidapi-host` header. */
  host?: string;
  /** Full base URL for requests. Defaults to `https://<host>/v1`. Override to point at a proxy. */
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Defaults to 10000. */
  timeoutMs?: number;
}

/** Internal, fully-resolved request configuration. */
export interface HttpConfig {
  apiKey: string;
  host: string;
  baseURL: string;
  timeoutMs: number;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
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

export type BatchQuoteResult = Record<string, Quote | { error: string }>;

// ---- Raw upstream (RapidAPI) response shapes ----

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
