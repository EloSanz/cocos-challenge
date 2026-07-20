import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import { Order } from '../../database/entities/order.entity';
import { MarketData } from '../../database/entities/marketdata.entity';
import { Instrument } from '../../database/entities/instrument.entity';
import { PortfolioSnapshot } from '../../database/entities/portfolio-snapshot.entity';
import { OrderStatus } from '../../database/enums/order.enum';
import { IPortfolioRepository } from '../interfaces/portfolio-repository.interface';

@Injectable()
export class PortfolioRepositoryImpl implements IPortfolioRepository {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(MarketData)
    private readonly marketDataRepo: Repository<MarketData>,
    @InjectRepository(Instrument)
    private readonly instrumentRepo: Repository<Instrument>,
    @InjectRepository(PortfolioSnapshot)
    private readonly snapshotRepo: Repository<PortfolioSnapshot>,
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
      // Order by id (the event sequence) to match findFilledOrdersAfter and
      // lastOrderId: the fold is order-dependent, so the full-scan fallback and
      // the snapshot-delta path must sequence events identically.
      order: {
        id: 'ASC',
      },
    });
  }

  /**
   * Fetches the latest market data row per instrument, scoped to the given
   * ids. Scoping keeps the read proportional to the user's open positions
   * instead of the whole market.
   */
  async findLatestMarketData(instrumentIds: number[]): Promise<MarketData[]> {
    if (instrumentIds.length === 0) {
      return [];
    }
    return this.marketDataRepo
      .createQueryBuilder('md')
      .distinctOn(['md.instrumentId'])
      .where('md.instrumentId IN (:...instrumentIds)', { instrumentIds })
      .orderBy('md.instrumentId', 'ASC')
      .addOrderBy('md.date', 'DESC')
      .getMany();
  }

  /**
   * Fetches ticker/name metadata for the given instrument ids, bounded by the
   * number of open positions rather than the user's order history.
   */
  async findInstrumentsByIds(instrumentIds: number[]): Promise<Instrument[]> {
    if (instrumentIds.length === 0) {
      return [];
    }
    return this.instrumentRepo.find({ where: { id: In(instrumentIds) } });
  }

  async findSnapshotByUser(userId: number): Promise<PortfolioSnapshot | null> {
    return this.snapshotRepo.findOne({ where: { userId } });
  }

  async saveSnapshot(snapshot: PortfolioSnapshot): Promise<void> {
    await this.snapshotRepo.save(snapshot);
  }

  async findFilledOrdersAfter(
    userId: number,
    lastOrderId: number,
  ): Promise<Order[]> {
    return this.orderRepo.find({
      where: {
        userId,
        status: OrderStatus.FILLED,
        id: MoreThan(lastOrderId),
      },
      order: { id: 'ASC' },
    });
  }

  async hasFilledOrders(userId: number): Promise<boolean> {
    const count = await this.orderRepo.countBy({
      userId,
      status: OrderStatus.FILLED,
    });
    return count > 0;
  }
}
