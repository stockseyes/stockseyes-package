import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { normalizeCandle, mockCandleSeries } from '../src/candles';
import type { RawCandle } from '../src/types';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../fixtures');
const load = (name: string) =>
  JSON.parse(readFileSync(resolve(fixturesDir, name), 'utf8'));

describe('normalizeCandle', () => {
  it('turns the raw candle fixture into the normalized fixture', () => {
    const raw = load('candle.json') as RawCandle;
    const expected = load('candle.normalized.json');
    const c = normalizeCandle(raw);

    expect(c).toMatchObject({
      open: expected.open,
      high: expected.high,
      low: expected.low,
      close: expected.close,
      volume: expected.volume,
    });
    expect(c.timestamp).toBeInstanceOf(Date);
    expect(c.timestamp.toISOString()).toBe(expected.timestamp);
  });
});

describe('mockCandleSeries', () => {
  const query = {
    symbol: 'RELIANCE',
    from: '2024-01-01T00:00:00.000Z',
    to: '2024-01-31T00:00:00.000Z',
    interval: '1d' as const,
  };

  it('is deterministic for the same query', () => {
    const a = mockCandleSeries(query);
    const b = mockCandleSeries(query);
    expect(a).toEqual(b);
  });

  it('covers the requested range with valid OHLC bars', () => {
    const series = mockCandleSeries(query);
    expect(series.tradingSymbol).toBe('RELIANCE');
    expect(series.interval).toBe('1d');
    expect(series.candles).toHaveLength(31); // inclusive daily bars, Jan 1–31

    for (const bar of series.candles) {
      expect(bar.high).toBeGreaterThanOrEqual(bar.open);
      expect(bar.high).toBeGreaterThanOrEqual(bar.close);
      expect(bar.low).toBeLessThanOrEqual(bar.open);
      expect(bar.low).toBeLessThanOrEqual(bar.close);
      expect(bar.volume).toBeGreaterThan(0);
    }
  });

  it('rejects an inverted range', () => {
    expect(() =>
      mockCandleSeries({ symbol: 'TCS', from: '2024-02-01', to: '2024-01-01' })
    ).toThrowError(/before/);
  });
});
