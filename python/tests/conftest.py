"""Shared pytest fixtures — loads sample data from ``../../fixtures/``."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable

import pytest

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent / "fixtures"


@pytest.fixture(scope="session")
def load_fixture() -> Callable[[str], Any]:
    """Read and parse a JSON fixture file."""
    def _load(name: str) -> Any:
        return json.loads((FIXTURES_DIR / name).read_text(encoding="utf-8"))
    return _load

