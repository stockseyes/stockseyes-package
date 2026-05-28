"""Stockseyes error types.

Every failed request surfaces as a :class:`StockEyesError` with a
machine-readable :attr:`code` — never a bare ``Exception``.
"""

from __future__ import annotations

from typing import Literal


StockEyesErrorCode = Literal[
    "rate_limit",
    "auth",
    "not_found",
    "http",
    "network",
    "timeout",
]


class StockEyesError(Exception):
    """Error thrown for every failed request, with a machine-readable ``code``.

    Attributes:
        code: One of ``rate_limit``, ``auth``, ``not_found``, ``http``,
              ``network``, or ``timeout``.
        status: The HTTP status code, or ``0`` for network/timeout failures.
    """

    def __init__(
        self,
        message: str,
        code: StockEyesErrorCode,
        status: int = 0,
    ) -> None:
        super().__init__(message)
        self.code: StockEyesErrorCode = code
        self.status: int = status

    def __repr__(self) -> str:
        return (
            f"StockEyesError({self.args[0]!r}, code={self.code!r}, "
            f"status={self.status})"
        )


def is_stockeyes_error(err: object) -> bool:
    """Type-guard: returns ``True`` if *err* is a :class:`StockEyesError`."""
    return isinstance(err, StockEyesError)


def _code_for_status(status: int) -> StockEyesErrorCode:
    """Map an HTTP status code to a :class:`StockEyesErrorCode`."""
    if status in (401, 403):
        return "auth"
    if status == 404:
        return "not_found"
    if status == 429:
        return "rate_limit"
    return "http"
