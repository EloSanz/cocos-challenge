import { Instrument } from '../../database/entities/instrument.entity';
import {
  PaginationOptions,
  PaginatedResult,
} from '../../common/interfaces/pagination.interface';

export interface IInstrumentsRepository {
  search(
    query: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Instrument>>;
}

export const IInstrumentsRepositoryToken = 'IInstrumentsRepository';
