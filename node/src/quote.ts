import { httpGet } from './http';
import { HttpConfig, Quote, RawQuote } from './types';


export function normalize(raw: RawQuote): Quote {
  const changePercent = raw.ohlc.close !== 0 
    ? (raw.change / raw.ohlc.close) * 100 
    : 0;
  
  return {
    symbol:        raw.tradingSymbol,
    name:          raw.tradingSymbol,
    price:         raw.lastPrice,
    change:        raw.change,
    changePercent: changePercent,
    open:          raw.ohlc.open,
    high:          raw.ohlc.high,
    low:           raw.ohlc.low,
    volume:        raw.volumeTradedToday,
    marketCap:     raw.marketCapInCrores,
    timestamp:     new Date(raw.timestamp),
    currency:      'INR', 
    exchange:      raw.exchange,
  };
}

export async function getQuote(config: HttpConfig, symbol: string, exchange: string): Promise<Quote> {
  const raw = await httpGet<RawQuote>(config, '/rapidapi/stock/quote', {
    tradingSymbol: symbol,
    exchange,
  });
  return normalize(raw);
}

export async function batchQuote(
  config: HttpConfig,
  symbols: string[],
  exchange: string,
): Promise<Record<string, Quote | { error: string }>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const results = await Promise.allSettled(unique.map((s) => getQuote(config, s, exchange)));

  return Object.fromEntries(
    unique.map((symbol, i) => {
      const r = results[i];
      return [
        symbol,
        r.status === 'fulfilled'
          ? r.value
          : { error: (r.reason as Error).message },
      ];
    }),
  );
}
