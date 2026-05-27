---
name: stockseyes-architecture
description: Stockseyes monorepo architecture and conventions. Read before adding a package or endpoint, or making any structural, naming, or contract decision in this repo.
---

# Stockseyes architecture

Stockseyes is a **polyglot SDK monorepo**: one repo, one brand (`stockseyes`), and **one
self-contained package per language/platform**. The SDKs wrap the Stockseyes Indian-stock
(NSE/BSE) APIs on RapidAPI. There is **no separate `core` package** — each platform package
bundles everything for that platform.

## Hard rules

- **Naming.** npm packages are scoped `@stockseyes/<platform>` (e.g. `@stockseyes/node`,
  `@stockseyes/react`). Python on PyPI is the flat name `stockseyes`. One top-level folder per
  package (`node/`, `react/`, `python/`).
- **The contract is `spec/openapi.yaml`** — the single source of truth for every SDK. It defines
  the raw upstream (wire) schemas **and** the normalized SDK shapes (`Quote`, `Instrument`,
  `SearchResult`). Every SDK must produce **identical** normalized output. Never let SDKs diverge:
  **change the spec first**, then the SDKs.
- **Fixtures enforce the contract.** `fixtures/` holds raw + normalized samples that every SDK's
  tests assert against, and `npm run check:contract` (repo root) validates them against the spec
  (CI: `.github/workflows/spec.yml`). This is the anti-drift gate.
- **The client core stays isomorphic** — no `fs`/`path`/DOM imports. Environment-specific output
  (file writes vs browser download) goes behind adapters/subpaths when added, so a browser/React
  package can reuse the same client.
- **Per-package, independent versioning.** CI is path-filtered per folder; release tags are
  `<platform>-vX.Y.Z`.

## Repo map

- `node/` — `@stockseyes/node`, the live TypeScript SDK and the **reference implementation**.
- `react/`, `python/` — planned platform packages (see `stockseyes-add-language-sdk`).
- `spec/openapi.yaml` — the contract.
- `fixtures/` — shared raw + normalized samples.
- `scripts/check-contract.mjs` + root `package.json` — the contract validator (`npm run check:contract`).
- `.github/workflows/` — `node.yml`, `publish-node.yml`, `spec.yml`.

## Roadmap (deferred, not yet built)

`@stockseyes/react` (depends on `@stockseyes/node`), the Python SDK, a **backtest-strategy engine**
(users implement a buy/sell strategy and get downloadable CSV / charts / HTML reports),
spec-driven client codegen, request retries/backoff, configurable search filters, and a real
historical-candles endpoint.

## When working here

- Adding or changing an endpoint or field → **`stockseyes-add-endpoint`**.
- Writing Node code → **`stockseyes-node-sdk`**.
- Adding a new platform (react/python) → **`stockseyes-add-language-sdk`**.

Canonical references: `README.md`, `spec/openapi.yaml`.
