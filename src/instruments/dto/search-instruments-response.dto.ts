import { InstrumentResponseDto } from './instrument-response.dto';

export class SearchMetaDto {
  /**
   * Number of instruments in this page
   * @example 1
   */
  count: number;

  /**
   * Total number of instruments matching the query, across all pages
   * @example 1
   */
  total: number;

  /**
   * @example 20
   */
  limit: number;

  /**
   * @example 0
   */
  offset: number;

  /**
   * Search term that was used
   * @example 'PAMP'
   */
  query: string;
}

export class SearchInstrumentsResponseDto {
  data: InstrumentResponseDto[];

  meta: SearchMetaDto;
}
