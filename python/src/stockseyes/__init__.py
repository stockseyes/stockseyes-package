"""Stockseyes Python SDK — real-time Indian stock market data.

Usage::

    from stockseyes import use_stockeyes

    client = use_stockeyes(StockEyesConfig(api_key="your-rapidapi-key"))

    quote = client.quote("RELIANCE")
    print(quote.price, quote.change_percent)

    results = client.search("REL")
    for i in results.results:
        print(i.symbol, i.name)
"""

from __future__ import annotations

from ._errors import StockEyesError, StockEyesErrorCode, is_stockeyes_error
from ._quote import batch_quote, get_quote, normalize_quote
from ._search import normalize_instrument, search_instruments
from ._types import (
    HttpConfig,
    Instrument,
    InstrumentType,
    Quote,
    SearchOptions,
    SearchResult,
    StockEyesConfig,
)

__all__ = [
    # Factory
    "use_stockeyes",
    "StockEyesClient",
    # Config
    "StockEyesConfig",
    "SearchOptions",
    # Normalised types
    "Quote",
    "Instrument",
    "InstrumentType",
    "SearchResult",
    # Errors
    "StockEyesError",
    "StockEyesErrorCode",
    "is_stockeyes_error",
    # Normaliser functions (for direct testing)
    "normalize_quote",
    "normalize_instrument",
]

DEFAULT_HOST = (
    "indian-stock-market-data-nse-bse-bcd-mcx-cds-nfo.p.rapidapi.com"
)
DEFAULT_TIMEOUT_S = 10.0


class StockEyesClient:
    """Client returned by :func:`use_stockeyes`.

    Do not instantiate directly — use the :func:`use_stockeyes` factory.
    """

    def __init__(self, config: HttpConfig) -> None:
        self._config = config

    def quote(self, symbol: str, exchange: str = "NSE") -> Quote:
        """Get a real-time quote for a single instrument."""
        return get_quote(self._config, symbol, exchange)

    def batch_quote(
        self,
        symbols: list[str],
        exchange: str = "NSE",
    ) -> dict[str, Quote | dict[str, str]]:
        """Fetch quotes for multiple symbols; per-symbol failures are returned."""
        return batch_quote(self._config, symbols, exchange)

    def search(
        self,
        term: str,
        options: SearchOptions | None = None,
    ) -> SearchResult:
        """Search instruments by trading symbol."""
        return search_instruments(self._config, term, options)


def use_stockeyes(config: StockEyesConfig) -> StockEyesClient:
    """Create a Stockseyes API client.

    This is the **only** entry point.  Do not instantiate
    :class:`StockEyesClient` directly.

    Args:
        config: A :class:`StockEyesConfig` with at least ``api_key`` set.

    Returns:
        A :class:`StockEyesClient` ready to make API calls.

    Raises:
        ValueError: If ``api_key`` is empty or missing.
    """
    if not config.api_key:
        raise ValueError("[StockEyes] api_key is required")

    host = config.host or DEFAULT_HOST
    http_config = HttpConfig(
        api_key=config.api_key,
        host=host,
        base_url=config.base_url or f"https://{host}/v1",
        timeout_s=config.timeout_s,
    )
    return StockEyesClient(http_config)
