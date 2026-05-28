"""Low-level HTTP helpers (stdlib ``urllib`` only — zero runtime dependencies).

All requests flow through :func:`http_get` / :func:`http_post`.  URLs are
built with :func:`build_url` (which uses ``urllib.parse.urlencode``) — never
by string-concatenating query params.
"""

from __future__ import annotations

import json
import socket
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from ._errors import StockEyesError, _code_for_status
from ._types import HttpConfig


def build_url(
    base_url: str,
    path: str,
    params: dict[str, Any] | None = None,
) -> str:
    """Build a full URL, encoding query params via ``urllib.parse.urlencode``.

    ``None`` values are silently dropped (matches the Node SDK behaviour).
    """
    url = f"{base_url}{path}"
    if not params:
        return url

    filtered = {
        k: str(v)
        for k, v in params.items()
        if v is not None
    }
    if not filtered:
        return url

    return f"{url}?{urlencode(filtered)}"


def _request(
    config: HttpConfig,
    path: str,
    *,
    method: str = "GET",
    params: dict[str, Any] | None = None,
    body: dict[str, Any] | None = None,
) -> Any:
    """Issue an HTTP request and return the parsed JSON response.

    Raises :class:`StockEyesError` for every failure category.
    """
    url = build_url(config.base_url, path, params)

    headers = {
        "x-rapidapi-key": config.api_key,
        "x-rapidapi-host": config.host,
        "Content-Type": "application/json",
    }

    data: bytes | None = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")

    req = Request(url, data=data, headers=headers, method=method)

    try:
        with urlopen(req, timeout=config.timeout_s) as resp:
            raw_body = resp.read().decode("utf-8")
    except HTTPError as exc:
        raise StockEyesError(
            f"HTTP {exc.code} {exc.reason} calling {path}",
            _code_for_status(exc.code),
            exc.code,
        ) from exc
    except (socket.timeout, TimeoutError) as exc:
        raise StockEyesError(
            f"Request to {path} timed out after {config.timeout_s}s",
            "timeout",
        ) from exc
    except URLError as exc:
        raise StockEyesError(
            f"Network error calling {path}: {exc.reason}",
            "network",
        ) from exc
    except OSError as exc:
        raise StockEyesError(
            f"Network error calling {path}: {exc}",
            "network",
        ) from exc

    result = json.loads(raw_body)

    # Mirror Node SDK: if the JSON body has a truthy `error` field, throw.
    if (
        isinstance(result, dict)
        and "error" in result
        and result["error"]
    ):
        raise StockEyesError(
            str(result["error"]),
            "http",
            200,
        )

    return result


def http_get(
    config: HttpConfig,
    path: str,
    params: dict[str, Any] | None = None,
) -> Any:
    """Issue an HTTP GET request."""
    return _request(config, path, method="GET", params=params)


def http_post(
    config: HttpConfig,
    path: str,
    body: dict[str, Any],
) -> Any:
    """Issue an HTTP POST request with a JSON body."""
    return _request(config, path, method="POST", body=body)
