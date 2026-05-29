"""Normaliser tests — asserts against the shared fixtures.

Mirrors ``node/test/normalize.test.ts`` exactly: load the raw fixture, run the
normaliser, and verify the output matches the ``*.normalized.json`` fixture.
"""

from __future__ import annotations

import math
from typing import Any, Callable

from stockseyes._quote import normalize_quote
from stockseyes._search import normalize_instrument
from stockseyes._types import RawQuote, RawSearchResponse



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
