import { InstrumentSearchResult } from './instrument-search.result';
import { SearchInstrumentsQuery } from './search-instruments.query';

export interface ISearchInstrumentsUseCase {
  execute(query: SearchInstrumentsQuery): Promise<InstrumentSearchResult>;
}

export const ISearchInstrumentsUseCaseToken = 'ISearchInstrumentsUseCase';
