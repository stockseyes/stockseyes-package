---
name: stockseyes-add-endpoint
description: Procedure to add or change a Stockseyes API endpoint or response field. Use whenever the API surface changes — it enforces the contract-first flow across the spec, fixtures, and every SDK.
---

# Adding or changing an endpoint (contract-first)

The spec is the source of truth and every SDK must stay identical, so **always change the spec and
fixtures before touching SDK code**. (Background: `stockseyes-architecture`.)

## Procedure

1. **Spec first** — in `spec/openapi.yaml`:
   - Add/modify the path under `paths:` (with its parameters or `requestBody`).
   - Add/modify the **raw** wire schema (`Raw*`) under `components/schemas`.
   - Add/modify the **normalized** schema (the cross-SDK contract) — keep it strict
     (`additionalProperties: false`, list `required`).

2. **Fixtures** — in `fixtures/`:
   - Add `<name>.json` (a realistic raw upstream response).
   - Add `<name>.normalized.json` (the exact normalized output an SDK must produce).
   - Register both in `FIXTURE_SCHEMAS` in `scripts/check-contract.mjs`
     (`<name>.json → Raw*`, `<name>.normalized.json → <NormalizedSchema>`).

3. **Gate** — run `npm run check:contract` at the repo root. It must pass before you write SDK code.

4. **Implement in each SDK** (Node is the reference — see `stockseyes-node-sdk`):
   - Add the `Raw*` and normalized types to `node/src/types.ts`.
   - Make the HTTP call through `httpGet`/`httpPost` with `buildUrl`/params — **never
     hand-concatenate query strings**.
   - Write an **exported, pure `normalize*`** function (raw → normalized).
   - Wire the method into `useStockEyes` and the `StockEyesClient` interface in `node/src/index.ts`.

5. **Test** — add a vitest test in `node/test/` that loads the fixtures (from `../../fixtures`) and
   asserts `normalize*(rawFixture)` deep-equals the normalized fixture.

6. **Verify** — from `node/`:
   `npm run type-check && npm run lint && npm test && npm run build && npm run size`.

## Rules

- Request failures must surface as `StockEyesError` (codes in `stockseyes-node-sdk`) — never bare errors.
- The normalized output must match the spec **exactly** in every SDK. If a shape needs to change,
  it changes in the spec + fixtures first (steps 1–3), then in all SDKs — never SDK-only.
