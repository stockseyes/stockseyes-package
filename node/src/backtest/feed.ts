import { StockEyesError } from '../http';
import type { BarInterval, Candle, CandleQuery } from '../types';
import type { StockEyesClient } from '../index';
import type { DataFeed } from './types';

/**
 * BYO-data feed: replay a pre-fetched candle array. Works fully offline and is the
 * basis for deterministic tests.
 */
export function arrayDataFeed(
  symbol: string,
  candles: Candle[],
  interval?: BarInterval
): DataFeed {
  let i = 0;
  return {
    symbol: symbol.toUpperCase(),
    interval,
    next() {
      return i < candles.length ? candles[i++] : null;
    },
    reset() {
      i = 0;
    },
  };
}

/**
 * Feed backed by the StockEyes client's historical candles. Candles are fetched once
 * up front in `load()` (awaited by the engine before iteration), so the per-bar loop
 * stays synchronous. Today this resolves to the mock candle source; when the upstream
 * historical route ships it transparently becomes live data.
 */
export function feedFromStockEyes(client: StockEyesClient, query: CandleQuery): DataFeed {
  let candles: Candle[] = [];
  let i = 0;
  return {
    symbol: query.symbol.toUpperCase(),
    interval: query.interval ?? '1d',
    async load() {
      candles = await client.candles(query);
      if (!candles.length) {
        throw new StockEyesError(
          'backtest: candle feed returned no candles for the requested range',
          'backtest'
        );
      }
      i = 0;
    },
    next() {
      return i < candles.length ? candles[i++] : null;
    },
    reset() {
      i = 0;
    },
  };
}
