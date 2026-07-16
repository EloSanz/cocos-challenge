import { Inject, Injectable } from '@nestjs/common';
import { IInstrumentsRepositoryToken } from '../../interfaces/instruments-repository.interface';
import type { IInstrumentsRepository } from '../../interfaces/instruments-repository.interface';
import { ISearchInstrumentsUseCase } from '../../interfaces/search-instruments-usecase.interface';
import { SearchInstrumentsQuery } from '../../interfaces/search-instruments.query';
import {
  InstrumentResult,
  InstrumentSearchResult,
} from '../../interfaces/instrument-search.result';

@Injectable()
export class SearchInstrumentsUseCaseImpl implements ISearchInstrumentsUseCase {
  constructor(
    @Inject(IInstrumentsRepositoryToken)
    private readonly instrumentsRepo: IInstrumentsRepository,
  ) {}

  async execute({
    query,
    limit,
    offset,
  }: SearchInstrumentsQuery): Promise<InstrumentSearchResult> {
    const { items: instruments, total } = await this.instrumentsRepo.search(
      query,
      {
        limit,
        offset,
      },
    );

    const data: InstrumentResult[] = instruments.map((instrument) => ({
      id: instrument.id,
      ticker: instrument.ticker,
      name: instrument.name,
      type: instrument.type,
    }));

    return {
      data,
      meta: {
        count: data.length,
        total,
        limit,
        offset,
        query,
      },
    };
  }
}
