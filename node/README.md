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

`StockEyesError` exposes `code` (`'rate_limit' | 'auth' | 'not_found' | 'http' | 'network' | 'timeout'`) and `status` (HTTP status, or `0` for network/timeout).

## License

[MIT](./LICENSE) © Tushar Singhal
