import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildUrl, httpGet, StockEyesError, isStockEyesError } from '../src/http';
import type { HttpConfig } from '../src/types';

const config: HttpConfig = {
  apiKey: 'test-key',
  host: 'example.p.rapidapi.com',
  baseURL: 'https://example.p.rapidapi.com/v1',
  timeoutMs: 5000,
};

const mockFetch = (impl: () => Promise<unknown>) =>
  vi.stubGlobal('fetch', vi.fn(impl) as unknown as typeof fetch);

afterEach(() => vi.unstubAllGlobals());

describe('buildUrl', () => {
  it('encodes query params (so symbols with special chars are safe)', () => {
    const url = buildUrl('https://h/v1', '/rapidapi/stock/quote', {
      tradingSymbol: 'M&M',
      exchange: 'NSE',
    });
    expect(url).toBe(
      'https://h/v1/rapidapi/stock/quote?tradingSymbol=M%26M&exchange=NSE'
    );
  });

  it('omits the query string when there are no params', () => {
    expect(buildUrl('https://h/v1', '/x')).toBe('https://h/v1/x');
  });

  it('skips undefined and null params', () => {
    expect(buildUrl('https://h', '/x', { a: 1, b: undefined, c: null })).toBe(
      'https://h/x?a=1'
    );
  });
});

describe('httpGet error mapping', () => {
  const cases: Array<[number, string]> = [
    [401, 'auth'],
    [403, 'auth'],
    [404, 'not_found'],
    [429, 'rate_limit'],
    [500, 'http'],
  ];

  for (const [status, code] of cases) {
    it(`maps HTTP ${status} → StockEyesError code "${code}"`, async () => {
      mockFetch(async () => ({
        ok: false,
        status,
        statusText: 'err',
        json: async () => ({}),
      }));
      await expect(httpGet(config, '/q')).rejects.toMatchObject({
        name: 'StockEyesError',
        code,
        status,
      });
    });
  }

  it('maps a network failure → "network"', async () => {
    mockFetch(async () => {
      throw new Error('boom');
    });
    await expect(httpGet(config, '/q')).rejects.toMatchObject({
      name: 'StockEyesError',
      code: 'network',
      status: 0,
    });
  });

  it('maps an abort/timeout → "timeout"', async () => {
    mockFetch(async () => {
      const e = new Error('The operation timed out');
      e.name = 'TimeoutError';
      throw e;
    });
    await expect(httpGet(config, '/q')).rejects.toMatchObject({ code: 'timeout' });
  });

  it('throws when the response body has an error field', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ error: 'bad symbol' }),
    }));
    const err = await httpGet(config, '/q').catch((e) => e);
    expect(isStockEyesError(err)).toBe(true);
    expect((err as StockEyesError).message).toBe('bad symbol');
  });

  it('resolves with the parsed JSON on success', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ hello: 'world' }),
    }));
    await expect(httpGet(config, '/q')).resolves.toEqual({ hello: 'world' });
  });
});
