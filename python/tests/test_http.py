"""HTTP layer tests — URL building and error mapping.

Mirrors ``node/test/http.test.ts`` exactly: verifies ``build_url`` encodes
params correctly, and that HTTP/network/timeout errors are mapped to the
correct :class:`StockEyesError` codes.
"""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread
from typing import Any, Generator

import pytest

from stockseyes._errors import StockEyesError, is_stockeyes_error
from stockseyes._http import build_url, http_get
from stockseyes._types import HttpConfig


# ---------------------------------------------------------------------------
# build_url tests
# ---------------------------------------------------------------------------

class TestBuildUrl:
    """build_url: encode query params via urllib (never string-concatenate)."""

    def test_encodes_query_params(self) -> None:
        url = build_url(
            "https://h/v1",
            "/rapidapi/stock/quote",
            {"tradingSymbol": "M&M", "exchange": "NSE"},
        )
        assert url == (
            "https://h/v1/rapidapi/stock/quote?"
            "tradingSymbol=M%26M&exchange=NSE"
        )

    def test_omits_query_string_when_no_params(self) -> None:
        assert build_url("https://h/v1", "/x") == "https://h/v1/x"

    def test_skips_none_params(self) -> None:
        url = build_url("https://h", "/x", {"a": 1, "b": None, "c": 2})
        assert url == "https://h/x?a=1&c=2"

    def test_returns_no_query_string_when_all_params_none(self) -> None:
        url = build_url("https://h", "/x", {"a": None, "b": None})
        assert url == "https://h/x"


# ---------------------------------------------------------------------------
# Helpers: tiny HTTP server for integration-style error mapping tests
# ---------------------------------------------------------------------------

class _Handler(BaseHTTPRequestHandler):
    """Programmable handler — response is set via class-level attributes."""

    status_code: int = 200
    body: dict[str, Any] = {}

    def do_GET(self) -> None:  # noqa: N802
        payload = json.dumps(self.body).encode()
        self.send_response(self.status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
        pass  # Silence server logs during tests


@pytest.fixture()
def local_server() -> Generator[int, None, None]:
    """Spin up a throwaway HTTP server for each test."""
    server = HTTPServer(("127.0.0.1", 0), _Handler)
    port = server.server_address[1]
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield port
    server.shutdown()


def _config_for(port: int) -> HttpConfig:
    return HttpConfig(
        api_key="test-key",
        host="example.p.rapidapi.com",
        base_url=f"http://127.0.0.1:{port}",
        timeout_s=5.0,
    )


# ---------------------------------------------------------------------------
# httpGet error mapping tests
# ---------------------------------------------------------------------------

class TestHttpErrorMapping:
    """HTTP status codes map to the correct StockEyesError codes."""

    @pytest.mark.parametrize(
        ("status", "expected_code"),
        [
            (401, "auth"),
            (403, "auth"),
            (404, "not_found"),
            (429, "rate_limit"),
            (500, "http"),
        ],
    )
    def test_maps_http_status_to_error_code(
        self, local_server: int, status: int, expected_code: str
    ) -> None:
        _Handler.status_code = status
        _Handler.body = {}

        config = _config_for(local_server)
        with pytest.raises(StockEyesError) as exc_info:
            http_get(config, "/q")

        assert exc_info.value.code == expected_code
        assert exc_info.value.status == status

    def test_throws_on_error_field_in_response_body(
        self, local_server: int
    ) -> None:
        _Handler.status_code = 200
        _Handler.body = {"error": "bad symbol"}

        config = _config_for(local_server)
        with pytest.raises(StockEyesError) as exc_info:
            http_get(config, "/q")

        assert is_stockeyes_error(exc_info.value)
        assert str(exc_info.value) == "bad symbol"

    def test_resolves_with_parsed_json_on_success(
        self, local_server: int
    ) -> None:
        _Handler.status_code = 200
        _Handler.body = {"hello": "world"}

        config = _config_for(local_server)
        result = http_get(config, "/q")

        assert result == {"hello": "world"}

    def test_timeout_error(self) -> None:
        """A server that never responds should produce a timeout error."""
        # Use an unreachable address with a very short timeout
        config = HttpConfig(
            api_key="test-key",
            host="example.p.rapidapi.com",
            base_url="http://198.51.100.1",  # TEST-NET-2: non-routable
            timeout_s=0.5,
        )
        with pytest.raises(StockEyesError) as exc_info:
            http_get(config, "/q")

        assert exc_info.value.code in ("timeout", "network")

    def test_network_error(self) -> None:
        """Connecting to a refused port should produce a network error."""
        config = HttpConfig(
            api_key="test-key",
            host="example.p.rapidapi.com",
            base_url="http://127.0.0.1:1",  # Almost certainly refused
            timeout_s=2.0,
        )
        with pytest.raises(StockEyesError) as exc_info:
            http_get(config, "/q")

        assert exc_info.value.code in ("network", "timeout")
