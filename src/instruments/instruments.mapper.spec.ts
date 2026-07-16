import { toSearchInstrumentsResponseDto } from './instruments.mapper';
import { InstrumentSearchResult } from './interfaces/instrument-search.result';

describe('instruments.mapper', () => {
  it('maps an InstrumentSearchResult to a SearchInstrumentsResponseDto', () => {
    const result: InstrumentSearchResult = {
      data: [
        {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: 'ACCIONES',
        },
      ],
      meta: { count: 1, total: 3, limit: 1, offset: 0, query: 'PAMP' },
    };

    expect(toSearchInstrumentsResponseDto(result)).toEqual({
      data: [
        {
          id: 47,
          ticker: 'PAMP',
          name: 'Pampa Holding S.A.',
          type: 'ACCIONES',
        },
      ],
      meta: { count: 1, total: 3, limit: 1, offset: 0, query: 'PAMP' },
    });
  });

  it('maps an empty result', () => {
    const result: InstrumentSearchResult = {
      data: [],
      meta: { count: 0, total: 0, limit: 20, offset: 0, query: 'zzzzz' },
    };

    expect(toSearchInstrumentsResponseDto(result)).toEqual({
      data: [],
      meta: { count: 0, total: 0, limit: 20, offset: 0, query: 'zzzzz' },
    });
  });
});
