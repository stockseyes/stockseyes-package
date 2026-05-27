# Stockseyes SDKs

Official client SDKs for the **Stockseyes** APIs — real-time **Indian stock market (NSE/BSE)** quotes, instrument search, and market data, served through [RapidAPI](https://rapidapi.com/).

This is a **polyglot monorepo**: one self-contained SDK per language/platform, each published to its own registry. Every SDK conforms to a single language-agnostic contract (see [`spec/`](./spec)) so behaviour stays identical across languages.

## SDKs

| SDK | Package | Registry | Status |
| --- | --- | --- | --- |
| Node.js / TypeScript | [`@stockseyes/node`](./node) | npm | ✅ Available |
| React | `@stockseyes/react` | npm | 🚧 Coming soon |
| Python | `stockseyes` | PyPI | 🚧 Coming soon |

## Repository layout

```
.
├── node/        # @stockseyes/node  — Node.js/TypeScript SDK (published to npm)
├── react/       # @stockseyes/react — React bindings (planned)
├── python/      # stockseyes        — Python SDK (planned, PyPI)
├── spec/        # OpenAPI 3.1 — the single source of truth every SDK conforms to
├── fixtures/    # shared sample API responses, validated against the spec in CI
└── .github/     # per-package CI + the spec/fixtures contract check
```

## The contract (`spec/` + `fixtures/`)

`spec/openapi.yaml` is the canonical definition of the API — endpoints, the raw wire
responses, **and** the normalized shapes every SDK must produce. `fixtures/` holds sample
responses that double as each SDK's test vectors. CI validates the fixtures against the spec,
so a change that would make the Node and (future) Python SDKs diverge fails the build.

## Development

Each language folder is self-contained. For the Node SDK:

```bash
cd node
npm ci
npm run build && npm test
```

## License

[MIT](./LICENSE) © Tushar Singhal
