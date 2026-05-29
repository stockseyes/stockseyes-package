"""Quote normalisation and fetching.

:func:`normalize_quote` is a **pure, exported function** so tests can target
it directly against the shared fixtures.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from ._http import http_get
from ._types import HttpConfig, Quote, RawQuote


def normalize_quote(raw: RawQuote) -> Quote:
    """Normalise a raw upstream quote into the SDK's :class:`Quote` shape.

    * ``changePercent`` guards against divide-by-zero (close == 0 → 0%).
    * ``timestamp`` is converted to a timezone-aware :class:`datetime`.
    * ``currency`` is always ``'INR'`` (Indian market).
    """
    close = raw["ohlc"]["close"]
    change_percent = (raw["change"] / close) * 100 if close != 0 else 0.0

    # Parse ISO-8601 timestamp — handle both 'Z' suffix and any offset; convert to UTC.
    ts_str = raw["timestamp"]
    if ts_str.endswith("Z"):
        ts_str = ts_str[:-1] + "+00:00"
    timestamp = datetime.fromisoformat(ts_str).astimezone(timezone.utc)

    return Quote(
        symbol=raw["tradingSymbol"],
        name=raw["tradingSymbol"],
        price=raw["lastPrice"],
        change=raw["change"],
        change_percent=change_percent,
        open=raw["ohlc"]["open"],
        high=raw["ohlc"]["high"],
        low=raw["ohlc"]["low"],
        volume=raw["volumeTradedToday"],
        market_cap=raw.get("marketCapInCrores"),
        timestamp=timestamp,
        currency="INR",
        exchange=raw["exchange"],
    )


def get_quote(config: HttpConfig, symbol: str, exchange: str = "NSE") -> Quote:
    """Fetch and normalise a single real-time quote."""
    raw: RawQuote = http_get(
        config,
        "/rapidapi/stock/quote",
        {"tradingSymbol": symbol, "exchange": exchange},
    )
    return normalize_quote(raw)


def batch_quote(
    config: HttpConfig,
    symbols: list[str],
    exchange: str = "NSE",
) -> dict[str, Quote | dict[str, str]]:
    """Fetch quotes for multiple symbols in parallel; per-symbol failures are returned, not raised.

    Mirrors the Node SDK's ``Promise.allSettled`` parallelism via a stdlib
    ``ThreadPoolExecutor`` — worker count is capped at 10 to avoid hammering
    upstream when callers pass a large list.
    """
    unique = list(dict.fromkeys(s.upper() for s in symbols))
    if not unique:
        return {}

    def fetch(symbol: str) -> tuple[str, Quote | dict[str, str]]:
        try:
            return symbol, get_quote(config, symbol, exchange)
        except Exception as exc:
            return symbol, {"error": str(exc)}

    result: dict[str, Quote | dict[str, str]] = {}
    with ThreadPoolExecutor(max_workers=min(len(unique), 10)) as pool:
        for symbol, value in pool.map(fetch, unique):
            result[symbol] = value

    return result
