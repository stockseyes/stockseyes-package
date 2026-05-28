"""Instrument search normalisation and fetching.

:func:`normalize_instrument` is a **pure, exported function** so tests can
target it directly against the shared fixtures.
"""

from __future__ import annotations

from ._http import http_post
from ._types import (
    HttpConfig,
    Instrument,
    InstrumentType,
    RawInstrument,
    RawSearchResponse,
    SearchOptions,
    SearchResult,
)


def _normalize_type(raw: str = "") -> InstrumentType:
    """Map a raw ``instrument_type`` string to the normalised enum."""
    t = raw.lower()
    if "eq" in t or "equity" in t or "stock" in t:
        return "stock"
    return "unknown"


def normalize_instrument(raw: RawInstrument) -> Instrument:
    """Normalise a single raw instrument into the SDK's :class:`Instrument`."""
    return Instrument(
        symbol=raw["tradingsymbol"],
        name=raw["name"],
        exchange=raw["exchange"],
        type=_normalize_type(raw.get("instrument_type", "")),
        currency="INR",
    )


def search_instruments(
    config: HttpConfig,
    term: str,
    options: SearchOptions | None = None,
) -> SearchResult:
    """Search instruments by trading symbol."""
    opts = options or SearchOptions()

    raw: RawSearchResponse = http_post(
        config,
        "/public/instruments/search",
        {
            "filterRequest": {
                "exchange": ["NSE"],
                "instrument_type": ["EQ"],
                "segment": ["NSE"],
            },
            "searchPatterns": {
                "tradingsymbol": term,
            },
            "paginationDetails": {
                "limit": opts.limit,
                "offset": opts.offset,
            },
        },
    )

    return SearchResult(
        query=term,
        results=[normalize_instrument(i) for i in raw["instruments"]],
    )
