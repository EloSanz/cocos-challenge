import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../database/entities/order.entity';
import { MarketData } from '../../database/entities/marketdata.entity';
import { OrderStatus } from '../../database/enums/order.enum';
import { IPortfolioRepository } from '../interfaces/portfolio-repository.interface';

@Injectable()
export class PortfolioRepositoryImpl implements IPortfolioRepository {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(MarketData)
    private readonly marketDataRepo: Repository<MarketData>,
  ) {}

  /**
   * Fetches all FILLED orders for a given user including instrument details.
   */
  async findFilledOrdersByUser(userId: number): Promise<Order[]> {
    return this.orderRepo.find({
      where: {
        userId,
        status: OrderStatus.FILLED,
      },
      relations: {
        instrument: true,
      },
      order: {
        datetime: 'ASC',
      },
    });
  }

  /**
   * Fetches the latest market data row per instrument.
   *
   * Uses a portable MAX(date) subquery instead of Postgres' DISTINCT ON:
   * TypeORM silently ignores distinctOn on non-Postgres drivers, so the
   * SQLite-backed e2e suite would return every row (and the portfolio would
   * price positions with a stale close) while production behaved correctly.
   */
  async findLatestMarketData(): Promise<MarketData[]> {
    return this.marketDataRepo
      .createQueryBuilder('md')
      .where((qb) => {
        const latestDate = qb
          .subQuery()
          .select('MAX(md2.date)')
          .from(MarketData, 'md2')
          .where('md2.instrumentId = md.instrumentId')
          .getQuery();
        return `md.date = ${latestDate}`;
      })
      .orderBy('md.instrumentId', 'ASC')
      .getMany();
  }
}
