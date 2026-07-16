/** Application-layer output for a single instrument (transport-agnostic). */
export interface InstrumentResult {
  id: number;
  ticker: string;
  name: string;
  type: string;
}

export interface SearchMeta {
  count: number;
  total: number;
  limit: number;
  offset: number;
  query: string;
}

export interface InstrumentSearchResult {
  data: InstrumentResult[];
  meta: SearchMeta;
}
