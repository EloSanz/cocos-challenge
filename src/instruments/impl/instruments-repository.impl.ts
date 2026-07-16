import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { Instrument } from '../../database/entities/instrument.entity';
import { IInstrumentsRepository } from '../interfaces/instruments-repository.interface';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../common/interfaces/pagination.interface';

const CASH_INSTRUMENT_TYPE = 'MONEDA';

@Injectable()
export class InstrumentsRepositoryImpl implements IInstrumentsRepository {
  constructor(
    @InjectRepository(Instrument)
    private readonly instrumentRepo: Repository<Instrument>,
  ) {}

  /**
   * Matches ticker OR name (case-insensitive, partial), excluding the MONEDA
   * pseudo-instrument since cash isn't a tradable market asset.
   */
  async search(
    query: string,
    { limit, offset }: PaginationOptions,
  ): Promise<PaginatedResult<Instrument>> {
    const [instruments, total] = await this.instrumentRepo.findAndCount({
      where: [
        { ticker: ILike(`%${query}%`), type: Not(CASH_INSTRUMENT_TYPE) },
        { name: ILike(`%${query}%`), type: Not(CASH_INSTRUMENT_TYPE) },
      ],
      order: { ticker: 'ASC' },
      take: limit,
      skip: offset,
    });

    return { items: instruments, total };
  }
}
