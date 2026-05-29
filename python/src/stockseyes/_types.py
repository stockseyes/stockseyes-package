"""Stockseyes SDK types — normalised shapes and raw upstream (wire) types.

Normalised shapes (``Quote``, ``Instrument``, ``SearchResult``) are the
cross-language contract defined in ``spec/openapi.yaml``.  Every SDK must
produce **identical** output for the same raw input.

Raw types (``RawQuote``, ``RawInstrument``, …) mirror the upstream RapidAPI
JSON payloads and are kept separate so normalisation logic is explicit.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Literal, TypedDict


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

@dataclass(frozen=True, slots=True)
class StockEyesConfig:
    """User-facing configuration for :func:`use_stockeyes`."""

    api_key: str
    """RapidAPI key, sent as the ``x-rapidapi-key`` header.  Required."""

    host: str | None = None
    """Bare RapidAPI host (domain only, no path).  Sent as ``x-rapidapi-host``."""

    base_url: str | None = None
    """Full base URL for requests.  Defaults to ``https://<host>/v1``."""

    timeout_s: float = 10.0
    """Per-request timeout in **seconds**.  Defaults to 10."""


@dataclass(frozen=True, slots=True)
class HttpConfig:
    """Internal, fully-resolved request configuration."""

    api_key: str
    host: str
    base_url: str
    timeout_s: float


@dataclass(frozen=True, slots=True)
class SearchOptions:
    """Pagination options for :meth:`StockEyesClient.search`."""

    limit: int = 5
    offset: int = 0


# ---------------------------------------------------------------------------
# Normalised (SDK) shapes — the cross-language contract
# ---------------------------------------------------------------------------

InstrumentType = Literal["stock", "etf", "index", "crypto", "forex", "unknown"]


@dataclass(frozen=True, slots=True)
class Quote:
    """A normalised real-time stock quote."""

    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    open: float
    high: float
    low: float
    volume: int
    market_cap: float | None
    timestamp: datetime
    currency: str
    exchange: str

    def to_dict(self) -> dict[str, Any]:
        """Serialise to a plain dict (ISO-8601 UTC timestamp string)."""
        # Convert to UTC first so the trailing "Z" is always accurate, even if a
        # caller built the Quote with an aware datetime in another timezone.
        # Naive datetimes are assumed UTC (matches the prior behaviour).
        if self.timestamp.tzinfo is None:
            ts_utc = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            ts_utc = self.timestamp.astimezone(timezone.utc)
        # Use strftime to always include milliseconds, matching JS toISOString().
        ts = ts_utc.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        return {
            "symbol": self.symbol,
            "name": self.name,
            "price": self.price,
            "change": self.change,
            "changePercent": self.change_percent,
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "volume": self.volume,
            "marketCap": self.market_cap,
            "timestamp": ts,
            "currency": self.currency,
            "exchange": self.exchange,
        }


@dataclass(frozen=True, slots=True)
class Instrument:
    """A normalised search-result instrument."""

    symbol: str
    name: str
    exchange: str
    type: InstrumentType
    currency: str

    def to_dict(self) -> dict[str, Any]:
        """Serialise to a plain dict."""
        return {
            "symbol": self.symbol,
            "name": self.name,
            "exchange": self.exchange,
            "type": self.type,
            "currency": self.currency,
        }


@dataclass(frozen=True, slots=True)
class SearchResult:
    """Normalised search response."""

    query: str
    results: list[Instrument]

    def to_dict(self) -> dict[str, Any]:
        """Serialise to a plain dict."""
        return {
            "query": self.query,
            "results": [r.to_dict() for r in self.results],
        }


# ---------------------------------------------------------------------------
# Raw upstream (RapidAPI) response shapes
# ---------------------------------------------------------------------------

class RawOHLC(TypedDict):
    open: float
    high: float
    low: float
    close: float


class RawQuote(TypedDict, total=False):
    # Required fields
    tradingSymbol: str
    exchange: str
    lastPrice: float
    change: float
    ohlc: RawOHLC
    volumeTradedToday: int
    timestamp: str
    marketCapInCrores: float | None
    # Optional fields
    lowerCircuitLimit: float
    upperCircuitLimit: float
    lastTradedTime: str
    instrumentToken: int
    oi: float
    averagePrice: float
    buyQuantity: int
    sellQuantity: int
    depth: dict[str, Any]
    error: str | None


class RawInstrument(TypedDict):
    instrument_token: int
    exchange_token: str
    tradingsymbol: str
    name: str
    last_price: str
    expiry: str
    strike: str
    tick_size: str
    lot_size: str
    instrument_type: str
    segment: str
    exchange: str


class RawSearchResponse(TypedDict):
    instruments: list[RawInstrument]
    totalCount: int
