import { Order } from '../../database/entities/order.entity';
import { MarketData } from '../../database/entities/marketdata.entity';
import { Instrument } from '../../database/entities/instrument.entity';
import { PortfolioSnapshot } from '../../database/entities/portfolio-snapshot.entity';

export interface IPortfolioRepository {
  findFilledOrdersByUser(userId: number): Promise<Order[]>;
  /** Latest market row per instrument, scoped to the given ids. */
  findLatestMarketData(instrumentIds: number[]): Promise<MarketData[]>;
  /** Ticker/name metadata for the given instrument ids. */
  findInstrumentsByIds(instrumentIds: number[]): Promise<Instrument[]>;
  findSnapshotByUser(userId: number): Promise<PortfolioSnapshot | null>;
  saveSnapshot(snapshot: PortfolioSnapshot): Promise<void>;
  findFilledOrdersAfter(userId: number, lastOrderId: number): Promise<Order[]>;
  /** Whether the user has ever had a FILLED order (i.e. any portfolio activity). */
  hasFilledOrders(userId: number): Promise<boolean>;
}

export const IPortfolioRepositoryToken = 'IPortfolioRepository';
