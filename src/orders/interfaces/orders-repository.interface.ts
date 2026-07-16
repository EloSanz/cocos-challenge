import Big from 'big.js';
import { Order } from '../../database/entities/order.entity';
import { Instrument } from '../../database/entities/instrument.entity';
import { User } from '../../database/entities/user.entity';
import { MarketData } from '../../database/entities/marketdata.entity';

export interface NewOrderData {
  userId: number;
  instrumentId: number;
  side: Order['side'];
  type: string;
  size: number;
  price: Big;
  status: Order['status'];
  datetime: Date;
}

export interface IOrdersRepository {
  findInstrumentById(instrumentId: number): Promise<Instrument | null>;
  findUserById(userId: number): Promise<User | null>;
  findFilledOrdersByUser(userId: number): Promise<Order[]>;
  findLatestMarketData(instrumentId: number): Promise<MarketData | null>;
  createOrder(data: NewOrderData): Promise<Order>;
  findOrderById(orderId: number): Promise<Order | null>;
  /**
   * Atomically flips a NEW order to CANCELLED. Returns false when the order
   * was not in NEW status (or does not exist), so concurrent cancels or a
   * cancel racing a fill cannot both succeed.
   */
  cancelOrderIfNew(orderId: number): Promise<boolean>;
}

export const IOrdersRepositoryToken = 'IOrdersRepository';
