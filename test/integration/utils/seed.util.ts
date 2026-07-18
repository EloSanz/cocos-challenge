import { DataSource } from 'typeorm';
import { Instrument } from '../../../src/database/entities/instrument.entity';
import { User } from '../../../src/database/entities/user.entity';
import { Order } from '../../../src/database/entities/order.entity';
import { MarketData } from '../../../src/database/entities/marketdata.entity';
import {
  OrderSide,
  OrderStatus,
  OrderType,
} from '../../../src/database/enums/order.enum';
import Big from 'big.js';

export const API_PATHS = {
  INSTRUMENTS: '/api/v1/instruments',
  PORTFOLIO: '/api/v1/portfolio',
  ORDERS: '/api/v1/orders',
};

export async function seedTestData(dataSource: DataSource) {
  const userRepo = dataSource.getRepository(User);
  const instrumentRepo = dataSource.getRepository(Instrument);
  const orderRepo = dataSource.getRepository(Order);
  const marketDataRepo = dataSource.getRepository(MarketData);

  // Users
  await userRepo.save([
    { id: 1, email: 'test1@test.com', accountNumber: '1001' },
    { id: 2, email: 'test2@test.com', accountNumber: '1002' },
  ]);

  // Instruments
  await instrumentRepo.save([
    { id: 1, ticker: 'ARS', name: 'PESOS', type: 'MONEDA' },
    { id: 2, ticker: 'AAPL', name: 'Apple Inc', type: 'ACCIONES' },
    {
      id: 3,
      ticker: 'GGAL',
      name: 'Grupo Financiero Galicia',
      type: 'ACCIONES',
    },
    { id: 4, ticker: 'YPFD', name: 'YPF', type: 'ACCIONES' },
  ]);

  // MarketData. AAPL has TWO dates on purpose: the portfolio and MARKET
  // execution must pick the latest close (200), never the stale one (100).
  // This guards the latest-price query against regressions (e.g. DISTINCT ON
  // being silently ignored on SQLite).
  await marketDataRepo.save([
    {
      instrumentId: 2,
      date: new Date('2023-07-13'),
      close: new Big(100),
      previousClose: new Big(95),
    },
    {
      instrumentId: 2,
      date: new Date('2023-07-14'),
      close: new Big(200),
      previousClose: new Big(190),
    },
    {
      instrumentId: 3,
      date: new Date('2023-07-14'),
      close: new Big(150),
      previousClose: new Big(145),
    },
  ]);

  // Orders
  await orderRepo.save([
    {
      userId: 1,
      instrumentId: 1, // ARS
      size: 10000,
      price: new Big(1),
      type: OrderType.MARKET,
      side: OrderSide.CASH_IN,
      status: OrderStatus.FILLED,
      datetime: new Date(),
    },
    {
      userId: 1,
      instrumentId: 2, // AAPL
      size: 10,
      price: new Big(150),
      type: OrderType.MARKET,
      side: OrderSide.BUY,
      status: OrderStatus.FILLED,
      datetime: new Date(),
    },
  ]);
}
