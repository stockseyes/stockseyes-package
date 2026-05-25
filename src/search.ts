import { httpPost } from './http';
import { HttpConfig, Instrument, RawInstrument, RawSearchResponse, SearchOptions, SearchResult } from './types';

function normalizeType(raw: string = ''): Instrument['type'] {
  const t = raw.toLowerCase();
  if (t.includes('eq') || t.includes('equity') || t.includes('stock')) return 'stock';
  return 'unknown';
}

function normalizeInstrument(raw: RawInstrument): Instrument {
  return {
    symbol:   raw.tradingsymbol,
    name:     raw.name,
    exchange: raw.exchange,
    type:     normalizeType(raw.instrument_type),
    currency: 'INR', 
  };
}

export async function searchInstruments(
  config: HttpConfig,
  term: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const {
    limit = 5,
    offset = 0,
  } = options;

  const raw = await httpPost<RawSearchResponse>(
    config,
    '/public/instruments/search',
    {
      filterRequest: {
        exchange: ['NSE'],
        instrument_type: ['EQ'],
        segment: ['NSE'],
      },
      searchPatterns: {
        tradingsymbol: term,
      },
      paginationDetails: {
        limit,
        offset,
      },
    }
  );

  return {
    query: term,
    results: raw.instruments.map(normalizeInstrument),
  };
}