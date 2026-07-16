import { Order } from '../../database/entities/order.entity';
import { MarketData } from '../../database/entities/marketdata.entity';

export interface IPortfolioRepository {
  findFilledOrdersByUser(userId: number): Promise<Order[]>;
  findLatestMarketData(): Promise<MarketData[]>;
}

export const IPortfolioRepositoryToken = 'IPortfolioRepository';
