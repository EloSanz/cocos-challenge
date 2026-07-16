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
   * Fetches the latest market price for all instruments using TypeORM QueryBuilder with DISTINCT ON.
   */
  async findLatestMarketData(): Promise<MarketData[]> {
    return this.marketDataRepo
      .createQueryBuilder('md')
      .distinctOn(['md.instrumentId'])
      .orderBy('md.instrumentId', 'ASC')
      .addOrderBy('md.date', 'DESC')
      .getMany();
  }
}
