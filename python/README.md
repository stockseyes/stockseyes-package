# stockseyes

Official [Stockseyes](https://github.com/stockseyes/stockseyes-package) SDK for Python — real-time **Indian stock market (NSE/BSE)** quotes, instrument search, and market data, served through the Stockseyes APIs on [RapidAPI](https://rapidapi.com/).

**Zero runtime dependencies.** Uses only Python's built-in `urllib`. Ships with inline type annotations ([PEP 561](https://peps.python.org/pep-0561/)).

## Install

```bash
pip install stockseyes
```

> Requires **Python ≥ 3.10**.

## Quickstart

```python
from stockseyes import use_stockeyes, StockEyesConfig

client = use_stockeyes(StockEyesConfig(api_key="your-rapidapi-key"))

quote = client.quote("RELIANCE")
print(f"{quote.symbol}  ₹{quote.price}  ({quote.change_percent:.2f}%)")
```

## Getting an API key

1. Subscribe to the Stockseyes API on RapidAPI.
2. Copy your **`X-RapidAPI-Key`** from the RapidAPI dashboard.
3. Pass it to `StockEyesConfig(api_key=...)`.

## ⚠️ Keep your key server-side

Your RapidAPI key is a **secret**. Never expose it in client-side or public code.

- **Do:** use this SDK in a backend service / API route / script.
- **If you must call from the browser:** put a proxy in front of RapidAPI and point the SDK at it with the `base_url` option.

## API

### `use_stockeyes(config) → StockEyesClient`

| Config | Type | Default | Description |
| --- | --- | --- | --- |
| `api_key` | `str` | — | **Required.** Your RapidAPI key (`x-rapidapi-key`). |
| `host` | `str \| None` | Stockseyes RapidAPI host | Bare RapidAPI host (`x-rapidapi-host`). |
| `base_url` | `str \| None` | `https://<host>/v1` | Override the request base URL (e.g. to point at your proxy). |
| `timeout_s` | `float` | `10.0` | Per-request timeout in seconds. |

### `client.quote(symbol, exchange="NSE") → Quote`

```python
q = client.quote("TCS", "NSE")
# Quote(symbol, name, price, change, change_percent, open, high, low,
#       volume, market_cap, timestamp, currency, exchange)
```

### `client.batch_quote(symbols, exchange="NSE") → dict`

Fetches many quotes sequentially; per-symbol failures are returned, not raised.

```python
batch = client.batch_quote(["RELIANCE", "TCS", "INFY"])
for symbol, data in batch.items():
    if isinstance(data, dict) and "error" in data:
        print(f"{symbol}: {data['error']}")
    else:
        print(f"{symbol}: ₹{data.price}")
```

### `client.search(term, options=None) → SearchResult`

```python
results = client.search("REL", SearchOptions(limit=10, offset=0))
for i in results.results:
    print(f"{i.symbol} — {i.name}")
```

## Error handling

Every failed request raises a typed `StockEyesError` so you can react programmatically:

```python
from stockseyes import use_stockeyes, StockEyesError, is_stockeyes_error

try:
    quote = client.quote("RELIANCE")
except StockEyesError as err:
    match err.code:
        case "rate_limit":  ...  # back off (HTTP 429)
        case "auth":        ...  # bad/expired key (401/403)
        case "not_found":   ...  # unknown symbol (404)
        case "timeout":     ...  # exceeded timeout_s
        case "network":     ...  # connection failed
        case _:             ...  # other HTTP error — see err.status
```

`StockEyesError` exposes `code` (`'rate_limit' | 'auth' | 'not_found' | 'http' | 'network' | 'timeout'`) and `status` (HTTP status, or `0` for network/timeout).

## Development

```bash
cd python
pip install -e ".[dev]"
pytest -v
```

## License

[MIT](./LICENSE) © Tushar Singhal
