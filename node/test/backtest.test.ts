import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { runBacktest, createBacktest, arrayDataFeed } from '../src/backtest';
import type { Strategy } from '../src/backtest';
import { sma, ema, rsi, stdev, highest, lowest } from '../src/backtest/indicators';
import { computeMetrics, sharpe, sortino } from '../src/backtest/metrics';
import { normalizeCandle } from '../src/candles';
import type { Candle, RawCandleSeries } from '../src/types';
import type { EquityPoint } from '../src/backtest';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../fixtures');
const load = (name: string) =>
  JSON.parse(readFileSync(resolve(fixturesDir, name), 'utf8'));

// The reference strategy documented in the spec for the golden fixture.
const reference: Strategy = {
  name: 'SMA(2)/SMA(3) crossover',
  onBar: (ctx) => {
    const fast = ctx.indicator.sma(2);
    const slow = ctx.indicator.sma(3);
    if (fast === undefined || slow === undefined) return;
    if (!ctx.position.isOpen && fast > slow) ctx.buy();
    else if (ctx.position.isOpen && fast < slow) ctx.close();
  },
};

describe('indicators', () => {
  it('sma / ema / stdev / highest / lowest over the last N (chronological)', () => {
    expect(sma([100, 102, 104], 2)).toBe(103);
    expect(sma([100, 102, 104], 3)).toBe(102);
    expect(sma([100], 2)).toBeUndefined();
    expect(ema([2, 4, 6], 3)).toBe(4); // seeded with SMA, no further bars
    expect(stdev([2, 4], 2)).toBe(1); // mean 3, population sd = 1
    expect(highest([1, 5, 3], 3)).toBe(5);
    expect(lowest([1, 5, 3], 3)).toBe(1);
  });

  it('rsi is 100 with only gains and undefined during warm-up', () => {
    const rising = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(rsi(rising, 14)).toBe(100);
    expect(rsi([1, 2, 3], 14)).toBeUndefined();
  });
});

describe('metrics', () => {
  it('max drawdown is the deepest peak-to-trough on the equity curve', () => {
    const curve: EquityPoint[] = [100, 120, 90, 110].map((equity, i) => ({
      timestamp: new Date(2024, 0, i + 1),
      equity,
      drawdownPct: 0,
    }));
    const m = computeMetrics({
      equityCurve: curve,
      trades: [],
      initialCash: 100,
      startTime: curve[0].timestamp,
      endTime: curve[curve.length - 1].timestamp,
      periodsPerYear: 252,
      riskFreeRate: 0,
      exposureBars: 0,
      totalBars: 4,
      buyHoldReturnPct: 10,
      totalCommission: 0,
    });
    expect(m.maxDrawdownPct).toBeCloseTo(-25, 6); // 90 vs peak 120
    expect(curve[2].drawdownPct).toBeCloseTo(-25, 6);
    expect(m.totalReturnPct).toBeCloseTo(10, 6); // 110/100 - 1
  });

  it('sharpe / sortino are 0 when there is no volatility', () => {
    expect(sharpe([0, 0, 0], 0, 252)).toBe(0);
    expect(sortino([0.01, 0.01, 0.01], 0, 252)).toBe(0);
  });
});

describe('engine — golden run (cross-SDK contract anchor)', () => {
  it('reproduces fixtures/backtest.normalized.json exactly', async () => {
    const series = load('backtest.input.json') as RawCandleSeries;
    const candles = series.candles.map(normalizeCandle);
    const expected = load('backtest.normalized.json');

    const result = await runBacktest({
      feed: arrayDataFeed('REF', candles, '1d'),
      strategy: reference,
      initialCash: 100_000,
      fillModel: 'close',
      positionSizing: { type: 'percent-equity', value: 1 },
      periodsPerYear: 252,
    });

    expect(result.toJSON()).toEqual(expected);
    // Human-meaningful spot checks.
    expect(result.metrics.totalTrades).toBe(1);
    expect(result.metrics.finalEquity).toBe(100961);
  });
});

describe('engine — behavior', () => {
  const upThenDown: Candle[] = [
    100, 102, 104, 106, 108, 107, 105, 103, 101, 100,
  ].map((close, i) => ({
    timestamp: new Date(Date.UTC(2024, 0, i + 1)),
    open: i === 0 ? 100 : 0, // open unused by the close-fill reference
    high: close + 1,
    low: close - 1,
    close,
    volume: 1000,
  }));

  it('default fill model is next-open (no look-ahead): an order decided on bar i fills at bar i+1 open', async () => {
    const opens = [100, 100, 102, 104, 106, 108, 107, 105, 103, 101];
    const candles: Candle[] = upThenDown.map((c, i) => ({ ...c, open: opens[i] }));
    // Buy on the very first eligible bar, then never sell — observe the entry fill price.
    const buyOnce: Strategy = {
      onBar: (ctx) => {
        if (ctx.index === 2 && !ctx.position.isOpen) ctx.buy(1);
      },
    };
    const result = await createBacktest({
      feed: arrayDataFeed('X', candles, '1d'),
      strategy: buyOnce,
      // fillModel omitted → defaults to 'next-open'
    }).run();
    // Order placed on bar 2 fills at bar 3's open (104), not bar 2's close (104 too) —
    // assert against the next bar's open explicitly.
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].fillPrice).toBe(opens[3]); // 104 = bar 3 open
    expect(result.orders[0].barIndex).toBe(3);
  });

  it('throws StockEyesError on an empty feed', async () => {
    await expect(
      runBacktest({ feed: [], strategy: reference })
    ).rejects.toThrowError(/no candles/);
  });
});
