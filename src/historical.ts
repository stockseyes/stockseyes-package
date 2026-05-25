import { httpGet } from './http';
import { HistoricalData, HistoricalOptions, Interval, OHLCV, Period } from './types';

interface HttpConfig {
  apiKey: string;
  host: string;
  baseURL: string;
}

interface RawCandle {
  date?: number | string;
  timestamp?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  adjclose?: number;
}

interface RawHistoricalResponse {
  // Adjust to match your Apis actual res
  prices?: RawCandle[];
  data?: RawCandle[];
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: number[];
          high?: number[];
          low?: number[];
          close?: number[];
          volume?: number[];
        }>;
        adjclose?: Array<{ adjclose?: number[] }>;
      };
    }>;
  };
}

function parseCandle(raw: RawCandle): OHLCV {
  const ts = raw.timestamp ?? raw.date;
  return {
    date:     typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts ?? ''),
    open:     raw.open   ?? 0,
    high:     raw.high   ?? 0,
    low:      raw.low    ?? 0,
    close:    raw.close  ?? 0,
    volume:   raw.volume ?? 0,
    adjClose: raw.adjclose,
  };
}


function flattenChartResponse(raw: RawHistoricalResponse): OHLCV[] {
  const result = raw.chart?.result?.[0];
  if (!result) return [];
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const adjclose = result.indicators?.adjclose?.[0]?.adjclose ?? [];

  return timestamps.map((ts, i) => ({
    date:     new Date(ts * 1000),
    open:     quote.open?.[i]   ?? 0,
    high:     quote.high?.[i]   ?? 0,
    low:      quote.low?.[i]    ?? 0,
    close:    quote.close?.[i]  ?? 0,
    volume:   quote.volume?.[i] ?? 0,
    adjClose: adjclose[i],
  }));
}

export async function getHistorical(
  config: HttpConfig,
  symbol: string,
  options: HistoricalOptions = {}
): Promise<HistoricalData> {
  const {
    period   = '1y',
    interval = '1d',
    from,
    to,
  } = options;


  //DUMmy api call
  const raw = await httpGet<RawHistoricalResponse>(config, '/historical', {
    symbol,
    period,
    interval,
    from,
    to,
  });

  // Support both flat array and chart-style responses
  let candles: OHLCV[];
  if (raw.prices)       candles = raw.prices.map(parseCandle);
  else if (raw.data)    candles = raw.data.map(parseCandle);
  else                  candles = flattenChartResponse(raw);

  // Sort ascending by date
  candles.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    symbol:   symbol.toUpperCase(),
    interval: interval as Interval,
    period:   (from || to ? 'custom' : period) as Period | 'custom',
    candles,
  };
}
