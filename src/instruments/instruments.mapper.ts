import { SearchInstrumentsResponseDto } from './dto/search-instruments-response.dto';
import { InstrumentSearchResult } from './interfaces/instrument-search.result';

/** Maps the application result to the transport response DTO. */
export function toSearchInstrumentsResponseDto(
  result: InstrumentSearchResult,
): SearchInstrumentsResponseDto {
  return {
    data: result.data.map((instrument) => ({
      id: instrument.id,
      ticker: instrument.ticker,
      name: instrument.name,
      type: instrument.type,
    })),
    meta: {
      count: result.meta.count,
      total: result.meta.total,
      limit: result.meta.limit,
      offset: result.meta.offset,
      query: result.meta.query,
    },
  };
}
