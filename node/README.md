# @stockseyes/node

Official [Stockseyes](https://github.com/stockseyes/stockseyes-package) SDK for Node.js — real-time **Indian stock market (NSE/BSE)** quotes, instrument search, and market data, served through the Stockseyes APIs on [RapidAPI](https://rapidapi.com/).

Zero runtime dependencies. Ships ESM + CommonJS + TypeScript types.

## Install

```bash
npm install @stockseyes/node
```

> Requires **Node.js ≥ 18** (uses the built-in global `fetch`).

## Quickstart

```ts
import { useStockEyes } from '@stockseyes/node';

const client = useStockEyes({ apiKey: process.env.STOCKSEYES_RAPIDAPI_KEY! });

const quote = await client.quote('RELIANCE');
console.log(quote.price, quote.changePercent);
```

## Getting an API key

1. Subscribe to the Stockseyes API on RapidAPI.
2. Copy your **`X-RapidAPI-Key`** from the RapidAPI dashboard.
3. Pass it to `useStockEyes({ apiKey })`.

## ⚠️ Keep your key server-side

Your RapidAPI key is a **secret**. If you call this SDK directly from browser/frontend code, the key is shipped to every visitor and can be stolen.

- **Do:** use this SDK in a backend (API route, server, serverless function) and expose only the data your frontend needs.
- **If you must call from the browser:** put a proxy in front of RapidAPI and point the SDK at it with the `baseUrl` option, so the real key never leaves your server.

## API

### `useStockEyes(config) → StockEyesClient`

| Config | Type | Default | Description |
| --- | --- | --- | --- |
| `apiKey` | `string` | — | **Required.** Your RapidAPI key (`x-rapidapi-key`). |
| `host` | `string` | Stockseyes RapidAPI host | Bare RapidAPI host (`x-rapidapi-host`). |
| `baseUrl` | `string` | `https://<host>/v1` | Override the request base URL (e.g. to point at your proxy). |
| `timeoutMs` | `number` | `10000` | Per-request timeout in milliseconds. |

### `client.quote(symbol, exchange?) → Promise<Quote>`

```ts
const q = await client.quote('TCS', 'NSE'); // exchange defaults to 'NSE'
// { symbol, name, price, change, changePercent, open, high, low,
//   volume, marketCap, timestamp, currency, exchange }
```

### `client.batchQuote(symbols, exchange?) → Promise<BatchQuoteResult>`

Fetches many quotes in parallel; per-symbol failures are returned, not thrown.

```ts
const batch = await client.batchQuote(['RELIANCE', 'TCS', 'INFY']);
for (const [symbol, data] of Object.entries(batch)) {
  if ('error' in data) console.error(`${symbol}: ${data.error}`);
  else console.log(`${symbol}: ${data.price}`);
}
```

### `client.search(term, options?) → Promise<SearchResult>`

```ts
const { results } = await client.search('REL', { limit: 10, offset: 0 });
results.forEach((i) => console.log(i.symbol, i.name));
```

### `client.candles(query) → Promise<Candle[]>`

Historical OHLC candles for an instrument over a date range.

> **Note:** the upstream historical route isn't live yet, so this is currently backed by a
> **deterministic mock** data source. The `Candle` shape and the method are final — only the
> data is simulated for now, so you can build and test against the real interface today.

```ts
const candles = await client.candles({
  symbol: 'RELIANCE',
  from: '2024-01-01',
  to: '2024-12-31',
  interval: '1d', // '1m' | '5m' | '15m' | '1h' | '1d' | '1w' (default '1d')
});
// Candle: { timestamp: Date, open, high, low, close, volume }
```

## Backtesting

Write a strategy, run it over a historical period, and get back metrics, trades, and an
equity curve. The engine ships under a subpath, so you only load it when you need it:

```ts
import { useStockEyes } from '@stockseyes/node';
import { createBacktest, feedFromStockEyes } from '@stockseyes/node/backtest';

const client = useStockEyes({ apiKey: process.env.STOCKSEYES_RAPIDAPI_KEY! });

const result = await createBacktest({
  feed: feedFromStockEyes(client, {
    symbol: 'RELIANCE', from: '2024-01-01', to: '2024-12-31', interval: '1d',
  }),
  initialCash: 100_000,
  strategy: {
    name: 'SMA 20/50 crossover',
    onBar: (ctx) => {
      const fast = ctx.indicator.sma(20);
      const slow = ctx.indicator.sma(50);
      if (fast === undefined || slow === undefined) return; // warming up
      if (!ctx.position.isOpen && fast > slow) ctx.buy();   // default sizing
      else if (ctx.position.isOpen && fast < slow) ctx.close();
    },
  },
}).run();

result.print();               // human-readable summary table
console.log(result.toJSON()); // structured result: metrics, trades, equityCurve
```

You implement a single `onBar(ctx)` hook and place orders with `ctx.buy() / ctx.sell() / ctx.close()`.
Everything you need lives on `ctx` — your editor lists it as you type `ctx.`:

| On `ctx` | What it gives you |
| --- | --- |
| `ctx.bar` | The current bar: `{ open, high, low, close, volume, timestamp }`. |
| `ctx.series.closes(n?)` | Newest-first lookback arrays (also `opens/highs/lows/volumes/candles`). |
| `ctx.indicator.sma(p)` | Indicators at the current bar: `sma, ema, rsi, stdev, highest, lowest, custom`. Return `undefined` during warm-up. |
| `ctx.position` | `{ isOpen, quantity, avgPrice, marketValue, unrealizedPnl, barsHeld }`. |
| `ctx.cash` / `ctx.equity` | Free cash / mark-to-market account value. |
| `ctx.buy(qty?)` | Go long (omit `qty` to use `positionSizing`). |
| `ctx.sell(qty?)` / `ctx.close()` | Reduce / flatten the position. |
| `ctx.state` | Mutable bag that persists across bars (stops, flags, …). |
| `ctx.log(msg)` | Attach a note to the current bar. |

### Config — `createBacktest(config)` / `runBacktest(config)`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `feed` | `DataFeed \| Candle[]` | — | **Required.** `feedFromStockEyes(client, query)`, `arrayDataFeed(symbol, candles)`, or a plain `Candle[]`. |
| `strategy` | `Strategy` | — | **Required.** `{ name?, init?, onBar, done? }`. |
| `initialCash` | `number` | `100_000` | Starting account cash. |
| `positionSizing` | `PositionSizing` | `{ type: 'percent-equity', value: 1 }` | Sizing when `ctx.buy()` is called without a qty. |
| `commission` | `Commission` | none | `{ type: 'flat', value }` or `{ type: 'percent', value }` (fraction of notional). |
| `slippage` | `number` | `0` | Fraction of price applied against fills. |
| `fillModel` | `'close' \| 'next-open'` | `'next-open'` | When orders fill. `next-open` avoids look-ahead bias. |
| `periodsPerYear` | `number` | inferred from interval | Annualization basis for Sharpe/CAGR. |
| `riskFreeRate` | `number` | `0` | Annual risk-free rate for Sharpe/Sortino. |

### Result

`run()` resolves to a `BacktestResult` with `metrics`, `trades`, `orders`, `equityCurve`,
plus `toJSON()`, `toString()`, and `print()`. `metrics` covers total return, CAGR, max
drawdown, Sharpe, Sortino, win rate, profit factor, exposure, and buy-and-hold for comparison.

> **Offline / tests:** pass a plain `Candle[]` (or use `arrayDataFeed(symbol, candles)`) instead
> of a client-backed feed — no API key needed.

## Error handling

Every failed request throws a typed `StockEyesError` so you can react programmatically:

```ts
import { useStockEyes, StockEyesError, isStockEyesError } from '@stockseyes/node';

try {
  await client.quote('RELIANCE');
} catch (err) {
  if (isStockEyesError(err)) {
    switch (err.code) {
      case 'rate_limit': /* back off (HTTP 429) */ break;
      case 'auth':       /* bad/expired key (401/403) */ break;
      case 'not_found':  /* unknown symbol (404) */ break;
      case 'timeout':    /* exceeded timeoutMs */ break;
      case 'network':    /* connection failed */ break;
      default:           /* other HTTP error — see err.status */ break;
    }
  }
}
```

`StockEyesError` exposes `code` (`'rate_limit' | 'auth' | 'not_found' | 'http' | 'network' | 'timeout' | 'candles' | 'backtest'`) and `status` (HTTP status, or `0` for network/timeout and engine errors).

## License

[MIT](./LICENSE) © Tushar Singhal
