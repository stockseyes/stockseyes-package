import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { normalize } from '../src/quote';
import { normalizeInstrument } from '../src/search';
import type { RawQuote, RawSearchResponse } from '../src/types';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../fixtures');
const load = (name: string) =>
  JSON.parse(readFileSync(resolve(fixturesDir, name), 'utf8'));

describe('normalize (quote)', () => {
  it('turns the raw quote fixture into the normalized fixture', () => {
    const raw = load('quote.json') as RawQuote;
    const expected = load('quote.normalized.json');
    const q = normalize(raw);

    expect(q).toMatchObject({
      symbol: expected.symbol,
      name: expected.name,
      price: expected.price,
      change: expected.change,
      open: expected.open,
      high: expected.high,
      low: expected.low,
      volume: expected.volume,
      marketCap: expected.marketCap,
      currency: expected.currency,
      exchange: expected.exchange,
    });
    expect(q.changePercent).toBeCloseTo(expected.changePercent, 6);
    expect(q.timestamp).toBeInstanceOf(Date);
    expect(q.timestamp.toISOString()).toBe(expected.timestamp);
  });

  it('returns 0% change when the reference close is 0', () => {
    const raw = load('quote.json') as RawQuote;
    const q = normalize({ ...raw, change: 10, ohlc: { ...raw.ohlc, close: 0 } });
    expect(q.changePercent).toBe(0);
  });
});

describe('normalizeInstrument (search)', () => {
  it('turns the raw search fixture into the normalized results', () => {
    const raw = load('search.json') as RawSearchResponse;
    const expected = load('search.normalized.json');
    expect(raw.instruments.map(normalizeInstrument)).toEqual(expected.results);
  });
});
