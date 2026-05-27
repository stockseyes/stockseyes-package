# Stockseyes — repo guide for Claude

This is the **Stockseyes polyglot SDK monorepo**: one self-contained SDK package per
language/platform, wrapping the Stockseyes Indian-stock (NSE/BSE) APIs on RapidAPI. `node/`
(`@stockseyes/node`) is live and is the reference implementation; `react/` and `python/` are planned.

## Invariants (do not violate)

- **Spec-first.** `spec/openapi.yaml` is the single source of truth. The normalized schemas
  (`Quote`, `Instrument`, `SearchResult`) are the cross-SDK contract — every SDK must emit the
  identical shape. Change the spec + `fixtures/` before any SDK code.
- **Run `npm run check:contract`** (repo root) after any change to `spec/` or `fixtures/`.
- **Naming:** npm `@stockseyes/<platform>`, PyPI flat `stockseyes`. One folder per package, with
  **no separate `core` package**.
- **The Node client core is isomorphic** — no `fs`/`path`/DOM in `node/src`; global `fetch` only.
- **All request failures throw `StockEyesError { code, status }`** — never a bare `Error`.
- **Per-package CI is path-filtered**; releases tag `<platform>-vX.Y.Z`.

## Skills (open the matching one)

- **stockseyes-architecture** — the monorepo model, contract, and roadmap. Read first.
- **stockseyes-add-endpoint** — adding/changing any endpoint or field (the contract-first flow).
- **stockseyes-node-sdk** — conventions for code under `node/`.
- **stockseyes-add-language-sdk** — standing up a new platform (react/python).

## Key commands

- Contract gate (repo root): `npm run check:contract`
- Node package (from `node/`): `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, `npm run size`
