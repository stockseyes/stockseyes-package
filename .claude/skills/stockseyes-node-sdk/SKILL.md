---
name: stockseyes-node-sdk
description: Implementation conventions for the @stockseyes/node package. Use when writing or changing any code under node/.
---

# @stockseyes/node conventions

`node/` is the reference implementation for all Stockseyes SDKs. Follow the existing patterns in
`node/src/{index,http,quote,search,types}.ts` rather than introducing new ones. (Architecture:
`stockseyes-architecture`; to add an endpoint: `stockseyes-add-endpoint`.)

## Public surface

- The only entry point is the factory **`useStockEyes(config)`**, returning a `StockEyesClient`.
  Do not expose classes or require `new`.
- Re-export public types plus `StockEyesError` / `isStockEyesError` from `node/src/index.ts`.

## Config

- `StockEyesConfig`: `apiKey` (required) + optional `host`, `baseUrl`, `timeoutMs`. Resolve it into
  the internal `HttpConfig`.
- `baseURL = config.baseUrl ?? https://<host>/v1`. `host` is the **bare domain** used for the
  `x-rapidapi-host` header — never put a path in `host`.

## HTTP layer (`node/src/http.ts`)

- All requests go through `httpGet` / `httpPost`. Build URLs with `buildUrl` (which uses
  `URLSearchParams`) — never string-concatenate query params.
- Set the `x-rapidapi-key` + `x-rapidapi-host` headers and `signal: AbortSignal.timeout(timeoutMs)`.

## Errors

- Every failure is a `StockEyesError { code, status }`. Codes:
  `rate_limit | auth | not_found | http | network | timeout`.
- Status → code mapping: 401/403 → `auth`, 404 → `not_found`, 429 → `rate_limit`, other non-2xx →
  `http`; a thrown `fetch` → `network`; an abort/timeout (`TimeoutError`/`AbortError`) → `timeout`.
- Never throw a bare `Error` from a request path.

## Normalization

- Keep `Raw*` (wire) types separate from the normalized types.
- Normalizers are **pure, exported functions** (so tests can target them directly).
- Convert timestamps to `Date`, guard divide-by-zero (e.g. `changePercent`), and the market is
  Indian so `currency: 'INR'`.

## Isomorphic constraints

- No `fs` / `path` / DOM imports in `src/`. Rely on the global `fetch` (engines `node >=18`).
- Anything Node-only or file-based belongs behind a future subpath, so `@stockseyes/react` can
  reuse this client in the browser.

## Packaging

- Zero runtime dependencies. Dual CJS + ESM via tsup; ship declaration files.
- `exports` condition order is `types → import → require`. `files: ["dist"]`,
  `sideEffects: false`, `publishConfig.access: "public"`.
- Keep both bundles under the `size-limit` (10 KB).

## Testing

- vitest. Load shared fixtures from `../../fixtures` and assert normalized output. Use `npm test`
  (`vitest run`) — bare `vitest` is watch mode.
