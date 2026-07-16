import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../database/entities/order.entity';
import { Instrument } from '../../database/entities/instrument.entity';
import { User } from '../../database/entities/user.entity';
import { MarketData } from '../../database/entities/marketdata.entity';
import { OrderStatus } from '../../database/enums/order.enum';
import {
  IOrdersRepository,
  NewOrderData,
} from '../interfaces/orders-repository.interface';

@Injectable()
export class OrdersRepositoryImpl implements IOrdersRepository {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Instrument)
    private readonly instrumentRepo: Repository<Instrument>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(MarketData)
    private readonly marketDataRepo: Repository<MarketData>,
  ) {}

  findInstrumentById(instrumentId: number): Promise<Instrument | null> {
    return this.instrumentRepo.findOne({ where: { id: instrumentId } });
  }

  findUserById(userId: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  /**
   * Fetches all FILLED orders for a given user, used to derive available cash and current holdings.
   */
  findFilledOrdersByUser(userId: number): Promise<Order[]> {
    return this.orderRepo.find({
      where: {
        userId,
        status: OrderStatus.FILLED,
      },
    });
  }

  /**
   * Fetches the latest market data row for a single instrument, used to price MARKET orders.
   */
  findLatestMarketData(instrumentId: number): Promise<MarketData | null> {
    return this.marketDataRepo.findOne({
      where: { instrumentId },
      order: { date: 'DESC' },
    });
  }

  createOrder(data: NewOrderData): Promise<Order> {
    const order = this.orderRepo.create(data);
    return this.orderRepo.save(order);
  }

  findOrderById(orderId: number): Promise<Order | null> {
    return this.orderRepo.findOne({ where: { id: orderId } });
  }

  async cancelOrderIfNew(orderId: number): Promise<boolean> {
    // Single conditional UPDATE: the WHERE clause makes the status check and
    // the transition atomic, so no lock is needed.
    const result = await this.orderRepo.update(
      { id: orderId, status: OrderStatus.NEW },
      { status: OrderStatus.CANCELLED },
    );
    return (result.affected ?? 0) > 0;
  }
}
