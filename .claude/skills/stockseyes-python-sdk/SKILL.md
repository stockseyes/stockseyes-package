---
name: stockseyes-python-sdk
description: Implementation conventions for the stockseyes Python package. Use when writing or changing any code under python/.
---

# stockseyes (Python) conventions

`python/` is the Python SDK for Stockseyes, conforming to the same contract as `@stockseyes/node`
(the reference implementation). Follow the existing patterns in `python/src/stockseyes/` rather
than introducing new ones. (Architecture: `stockseyes-architecture`; to add an endpoint:
`stockseyes-add-endpoint`.)

## Public surface

- The only entry point is the factory **`use_stockeyes(config)`**, returning a `StockEyesClient`.
  Do not require users to import internal modules directly.
- Re-export public types plus `StockEyesError` / `is_stockeyes_error` from `__init__.py`.

## Config

- `StockEyesConfig`: `api_key` (required) + optional `host`, `base_url`, `timeout_s`.  Resolve it
  into the internal `HttpConfig`.
- `base_url = config.base_url or f"https://{host}/v1"`. `host` is the **bare domain** used for the
  `x-rapidapi-host` header — never put a path in `host`.

## HTTP layer (`python/src/stockseyes/_http.py`)

- All requests go through `http_get` / `http_post`.  Build URLs with `build_url` (which uses
  `urllib.parse.urlencode`) — never string-concatenate query params.
- **Zero runtime dependencies** — uses only stdlib `urllib.request`.
- Set the `x-rapidapi-key` + `x-rapidapi-host` headers and `timeout=timeout_s`.

## Errors

- Every failure is a `StockEyesError(code, status)`.  Codes:
  `rate_limit | auth | not_found | http | network | timeout`.
- Status → code mapping: 401/403 → `auth`, 404 → `not_found`, 429 → `rate_limit`, other non-2xx →
  `http`; `URLError` → `network`; `socket.timeout`/`TimeoutError` → `timeout`.
- Never raise a bare `Exception` from a request path.

## Normalisation

- Keep `Raw*` (wire) types (TypedDicts) separate from the normalised dataclasses.
- Normalisers are **pure, exported functions** (so tests can target them directly).
- Convert timestamps to `datetime` (timezone-aware UTC), guard divide-by-zero (e.g.
  `change_percent`), and the market is Indian so `currency: 'INR'`.

## Naming

- Python names use `snake_case` for functions/variables and `PascalCase` for classes.
- Serialised JSON output uses `camelCase` keys (matching the spec) — see `to_dict()` methods.

## Packaging

- Zero runtime dependencies.  Build with `hatchling` (src layout).
- Ship `py.typed` (PEP 561) for inline type annotations.
- `requires-python = ">=3.10"`.

## Testing

- pytest.  Load shared fixtures from `../../fixtures` and assert normalised output.
  Use `pytest -v` from the `python/` directory.
