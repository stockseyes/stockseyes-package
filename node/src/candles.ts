import { StockEyesError } from './http';
import {
  BarInterval,
  Candle,
  CandleQuery,
  HttpConfig,
  RawCandle,
  RawCandleSeries,
} from './types';

const INTERVAL_MS: Record<BarInterval, number> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '1d': 24 * 60 * 60_000,
  '1w': 7 * 24 * 60 * 60_000,
};

/** Pure: raw upstream candle → normalized `Candle` (timestamp → `Date`). */
export function normalizeCandle(raw: RawCandle): Candle {
  return {
    timestamp: new Date(raw.timestamp),
    open: raw.open,
    high: raw.high,
    low: raw.low,
    close: raw.close,
    volume: raw.volume,
  };
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** FNV-1a string hash → 32-bit seed. */
function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — a tiny deterministic PRNG (so the same query yields the same series). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * MOCK historical candle source. The upstream RapidAPI route is not live yet, so this
 * generates a deterministic OHLCV random walk over the requested range. Swap this for a
 * real `httpGet<RawCandleSeries>(...)` call when the endpoint ships — the wire shape and
 * `normalizeCandle` stay the same.
 */
export function mockCandleSeries(query: CandleQuery): RawCandleSeries {
  const interval = query.interval ?? '1d';
  const stepMs = INTERVAL_MS[interval];
  const fromMs = new Date(query.from).getTime();
  const toMs = new Date(query.to).getTime();

  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    throw new StockEyesError('candles: invalid `from`/`to` date', 'candles');
  }
  if (toMs < fromMs) {
    throw new StockEyesError('candles: `to` is before `from`', 'candles');
  }

  const symbol = query.symbol.toUpperCase();
  const exchange = query.exchange ?? 'NSE';
  const rand = mulberry32(hashSeed(`${symbol}|${interval}|${fromMs}|${toMs}`));

  const candles: RawCandle[] = [];
  let price = 100 + rand() * 900; // starting price in 100–1000
  for (let t = fromMs; t <= toMs; t += stepMs) {
    const open = round2(price);
    const drift = (rand() - 0.48) * 0.04; // slight upward bias, ~±4% per bar
    const close = round2(Math.max(1, open * (1 + drift)));
    const high = round2(Math.max(open, close) * (1 + rand() * 0.01));
    const low = round2(Math.min(open, close) * (1 - rand() * 0.01));
    const volume = Math.floor(100_000 + rand() * 900_000);
    candles.push({
      timestamp: new Date(t).toISOString(),
      open,
      high,
      low,
      close,
      volume,
    });
    price = close;
  }

  return { tradingSymbol: symbol, exchange, interval, candles };
}

/**
 * Fetch a normalized historical candle series. Backed by a mock data source for now (see
 * {@link mockCandleSeries}); when the upstream route lands, replace the mock call with
 * `httpGet<RawCandleSeries>(config, '/rapidapi/stock/candles', { tradingSymbol, exchange, interval, from, to })`.
 */
export async function getCandles(
  config: HttpConfig,
  query: CandleQuery
): Promise<Candle[]> {
  void config; // unused until the real upstream call is wired in
  const series = mockCandleSeries(query);
  return series.candles.map(normalizeCandle);
}
