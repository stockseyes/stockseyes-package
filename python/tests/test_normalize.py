"""Normaliser tests — asserts against the shared fixtures.

Mirrors ``node/test/normalize.test.ts`` exactly: load the raw fixture, run the
normaliser, and verify the output matches the ``*.normalized.json`` fixture.
"""

from __future__ import annotations

import math
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

import pytest

from stockseyes import _quote as quote_module
from stockseyes._quote import batch_quote, normalize_quote
from stockseyes._search import normalize_instrument
from stockseyes._types import HttpConfig, Quote, RawQuote, RawSearchResponse



# -- Quote normalisation ---------------------------------------------------

class TestNormalizeQuote:
    """normalize_quote: raw fixture → normalised fixture."""

    def test_turns_raw_quote_into_normalised_fixture(
        self, load_fixture: Callable[[str], Any]
    ) -> None:
        raw: RawQuote = load_fixture("quote.json")
        expected = load_fixture("quote.normalized.json")

        q = normalize_quote(raw)

        assert q.symbol == expected["symbol"]
        assert q.name == expected["name"]
        assert q.price == expected["price"]
        assert q.change == expected["change"]
        assert q.open == expected["open"]
        assert q.high == expected["high"]
        assert q.low == expected["low"]
        assert q.volume == expected["volume"]
        assert q.market_cap == expected["marketCap"]
        assert q.currency == expected["currency"]
        assert q.exchange == expected["exchange"]

        # changePercent: floating-point tolerance
        assert math.isclose(
            q.change_percent, expected["changePercent"], rel_tol=1e-6
        )

        # timestamp: converted to datetime, ISO string matches fixture
        assert q.to_dict()["timestamp"] == expected["timestamp"]

    def test_returns_zero_percent_when_close_is_zero(
        self, load_fixture: Callable[[str], Any]
    ) -> None:
        raw: RawQuote = load_fixture("quote.json")
        raw["change"] = 10
        raw["ohlc"] = {**raw["ohlc"], "close": 0}

        q = normalize_quote(raw)

        assert q.change_percent == 0.0

    def test_converts_non_utc_offset_to_utc(
        self, load_fixture: Callable[[str], Any]
    ) -> None:
        """A raw timestamp with a non-Z offset is converted to UTC, not relabelled."""
        raw: RawQuote = load_fixture("quote.json")
        # 15:45 IST (+05:30) is exactly the 10:15 UTC the fixture already encodes.
        raw["timestamp"] = "2026-05-27T15:45:00.000+05:30"

        q = normalize_quote(raw)

        assert q.timestamp.tzinfo is not None
        assert q.timestamp == datetime(2026, 5, 27, 10, 15, 0, tzinfo=timezone.utc)
        assert q.to_dict()["timestamp"] == "2026-05-27T10:15:00.000Z"

    def test_to_dict_with_non_utc_constructed_quote(self) -> None:
        """A user-built Quote with a non-UTC datetime serialises to UTC."""
        ist = timezone(timedelta(hours=5, minutes=30))
        q = Quote(
            symbol="RELIANCE",
            name="RELIANCE",
            price=2954.25,
            change=29.25,
            change_percent=1.0,
            open=2930.0,
            high=2960.0,
            low=2920.0,
            volume=5839201,
            market_cap=1995432.5,
            timestamp=datetime(2026, 5, 27, 15, 45, 0, tzinfo=ist),
            currency="INR",
            exchange="NSE",
        )

        assert q.to_dict()["timestamp"] == "2026-05-27T10:15:00.000Z"


# -- batch_quote parallelism ----------------------------------------------

class TestBatchQuoteParallelism:
    """batch_quote must fan out concurrently to match the Node SDK."""

    def test_runs_in_parallel(self, monkeypatch: pytest.MonkeyPatch) -> None:
        delay = 0.2
        symbols = ["A", "B", "C", "D", "E"]

        def slow_get_quote(
            config: HttpConfig, symbol: str, exchange: str = "NSE"
        ) -> Quote:
            time.sleep(delay)
            return Quote(
                symbol=symbol,
                name=symbol,
                price=1.0,
                change=0.0,
                change_percent=0.0,
                open=1.0,
                high=1.0,
                low=1.0,
                volume=0,
                market_cap=None,
                timestamp=datetime(2026, 5, 27, 10, 15, 0, tzinfo=timezone.utc),
                currency="INR",
                exchange="NSE",
            )

        monkeypatch.setattr(quote_module, "get_quote", slow_get_quote)

        config = HttpConfig(
            api_key="k", host="h", base_url="https://h/v1", timeout_s=5.0
        )
        start = time.monotonic()
        result = batch_quote(config, symbols)
        elapsed = time.monotonic() - start

        assert set(result.keys()) == set(symbols)
        # Sequential would take ~5 * delay = 1.0s; parallel should be ~delay.
        # Allow generous headroom for CI scheduling jitter.
        assert elapsed < delay * len(symbols) * 0.6, (
            f"batch_quote took {elapsed:.2f}s — likely running sequentially"
        )


# -- Search / instrument normalisation ------------------------------------

class TestNormalizeInstrument:
    """normalize_instrument: raw search fixture → normalised results."""

    def test_turns_raw_search_into_normalised_results(
        self, load_fixture: Callable[[str], Any]
    ) -> None:
        raw: RawSearchResponse = load_fixture("search.json")
        expected = load_fixture("search.normalized.json")

        result = [normalize_instrument(i) for i in raw["instruments"]]

        assert [r.to_dict() for r in result] == expected["results"]
