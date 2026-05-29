#!/usr/bin/env python3
"""Live smoke test for the ``stockseyes`` Python SDK.

Build/install first, then run with your key::

    pip install -e ".[dev]"
    STOCKSEYES_RAPIDAPI_KEY=your_key python examples/smoke.py
"""

from __future__ import annotations

import os
import sys


def main() -> None:
    from stockseyes import (
        StockEyesConfig,
        is_stockeyes_error,
        use_stockeyes,
    )

    api_key = os.environ.get("STOCKSEYES_RAPIDAPI_KEY", "")
    if not api_key:
        print("Set STOCKSEYES_RAPIDAPI_KEY to your RapidAPI key first.", file=sys.stderr)
        sys.exit(1)

    client = use_stockeyes(StockEyesConfig(api_key=api_key))

    try:
        print('quote("RELIANCE")…')
        q = client.quote("RELIANCE")
        print(f"  {q.symbol}  ₹{q.price}  ({q.change_percent:.2f}%)  @ {q.exchange}")

        print('search("REL")…')
        s = client.search("REL")
        for i in s.results:
            print(f"  {i.symbol} — {i.name}")

        print("\n✅ Live smoke test passed.")

    except Exception as err:
        if is_stockeyes_error(err):
            print(
                f"\n❌ StockEyesError [{err.code}] status={err.status}: {err}",  # type: ignore[attr-defined]
                file=sys.stderr,
            )
        else:
            print(f"\n❌ Unexpected error: {err}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
