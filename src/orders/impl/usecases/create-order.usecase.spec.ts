import { Test, TestingModule } from '@nestjs/testing';
import Big from 'big.js';
import {
  EntityNotFoundException,
  InvalidInputException,
  ResourceLockedException,
} from '../../../common/exceptions/domain.exceptions';
import { CreateOrderUseCaseImpl } from './create-order.usecase';
import { IOrdersRepositoryToken } from '../../interfaces/orders-repository.interface';
import type { IOrdersRepository } from '../../interfaces/orders-repository.interface';
import {
  OrderSide,
  OrderStatus,
  OrderType,
} from '../../../database/enums/order.enum';
import { Order } from '../../../database/entities/order.entity';
import { Instrument } from '../../../database/entities/instrument.entity';
import { User } from '../../../database/entities/user.entity';
import { MarketData } from '../../../database/entities/marketdata.entity';
import { KeyedMutex } from '../../../infrastructure/mutex/keyed-mutex';
import { IMutexToken } from '../../../common/interfaces/mutex.interface';

describe('CreateOrderUseCaseImpl', () => {
  let useCase: CreateOrderUseCaseImpl;
  let repo: jest.Mocked<IOrdersRepository>;

  const user = {
    id: 1,
    email: 'user@test.com',
    accountNumber: 'ACC-1',
  } as User;
  const instrument = {
    id: 10,
    ticker: 'PAMP',
    name: 'Pampa Holding S.A.',
    type: 'ACCIONES',
  } as Instrument;

  const marketData = {
    instrumentId: 10,
    close: new Big('500.00'),
    previousClose: new Big('480.00'),
  } as MarketData;

  const cashInOrder = (userId: number, size: number): Order =>
    ({
      instrumentId: 66,
      userId,
      side: OrderSide.CASH_IN,
      size,
      price: new Big('1.00'),
      status: OrderStatus.FILLED,
    }) as Order;

  const buyOrder = (
    userId: number,
    instrumentId: number,
    size: number,
    price: number,
  ): Order =>
    ({
      instrumentId,
      userId,
      side: OrderSide.BUY,
      size,
      price: new Big(price),
      status: OrderStatus.FILLED,
    }) as Order;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderUseCaseImpl,
        {
          provide: IMutexToken,
          useClass: KeyedMutex,
        },
        {
          provide: IOrdersRepositoryToken,
          useValue: {
            findInstrumentById: jest.fn(),
            findUserById: jest.fn(),
            findFilledOrdersByUser: jest.fn(),
            findLatestMarketData: jest.fn(),
            createOrder: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(CreateOrderUseCaseImpl);
    repo = module.get(IOrdersRepositoryToken);

    repo.findUserById.mockResolvedValue(user);
    repo.findInstrumentById.mockResolvedValue(instrument);
    repo.findLatestMarketData.mockResolvedValue(marketData);
    repo.createOrder.mockImplementation((data) =>
      Promise.resolve({ id: 1, ...data } as unknown as Order),
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('fills a MARKET BUY order at the latest close price when cash is sufficient', async () => {
    repo.findFilledOrdersByUser.mockResolvedValue([cashInOrder(1, 100000)]);

    const result = await useCase.execute({
      userId: 1,
      instrumentId: 10,
      type: OrderType.MARKET,
      side: OrderSide.BUY,
      size: 10,
    });

    expect(result.status).toBe(OrderStatus.FILLED);
    expect(result.price).toBe(500);

    const created = repo.createOrder.mock.calls[0][0];
    expect(created.status).toBe(OrderStatus.FILLED);
    expect(created.size).toBe(10);
    expect(created.price.toNumber()).toBe(500);
  });

  it('rejects a BUY order that costs more than the available cash', async () => {
    repo.findFilledOrdersByUser.mockResolvedValue([cashInOrder(1, 1000)]);

    const result = await useCase.execute({
      userId: 1,
      instrumentId: 10,
      type: OrderType.MARKET,
      side: OrderSide.BUY,
      size: 10,
    });

    expect(result.status).toBe(OrderStatus.REJECTED);
  });

  it('marks a LIMIT order as NEW instead of FILLED when funds are sufficient', async () => {
    repo.findFilledOrdersByUser.mockResolvedValue([cashInOrder(1, 100000)]);

    const result = await useCase.execute({
      userId: 1,
      instrumentId: 10,
      type: OrderType.LIMIT,
      side: OrderSide.BUY,
      size: 10,
      price: 450,
    });

    expect(result.status).toBe(OrderStatus.NEW);
    expect(result.price).toBe(450);
  });

  it('rejects a SELL order when the user does not hold enough shares', async () => {
    repo.findFilledOrdersByUser.mockResolvedValue([
      cashInOrder(1, 100000),
      buyOrder(1, 10, 5, 500),
    ]);

    const result = await useCase.execute({
      userId: 1,
      instrumentId: 10,
      type: OrderType.MARKET,
      side: OrderSide.SELL,
      size: 10,
    });

    expect(result.status).toBe(OrderStatus.REJECTED);
  });

  it('fills a SELL order when the user holds enough shares', async () => {
    repo.findFilledOrdersByUser.mockResolvedValue([
      cashInOrder(1, 100000),
      buyOrder(1, 10, 10, 500),
    ]);

    const result = await useCase.execute({
      userId: 1,
      instrumentId: 10,
      type: OrderType.MARKET,
      side: OrderSide.SELL,
      size: 10,
    });

    expect(result.status).toBe(OrderStatus.FILLED);
  });

  it('computes the max whole number of shares when an amount in pesos is sent instead of size', async () => {
    repo.findFilledOrdersByUser.mockResolvedValue([cashInOrder(1, 100000)]);

    const result = await useCase.execute({
      userId: 1,
      instrumentId: 10,
      type: OrderType.MARKET,
      side: OrderSide.BUY,
      amount: 1999,
    });

    expect(result.size).toBe(3);
    expect(result.status).toBe(OrderStatus.FILLED);
  });

  it('throws InvalidInputException when both size and amount are provided', async () => {
    await expect(
      useCase.execute({
        userId: 1,
        instrumentId: 10,
        type: OrderType.MARKET,
        side: OrderSide.BUY,
        size: 1,
        amount: 100,
      }),
    ).rejects.toThrow(InvalidInputException);
  });

  it('throws InvalidInputException when neither size nor amount are provided', async () => {
    await expect(
      useCase.execute({
        userId: 1,
        instrumentId: 10,
        type: OrderType.MARKET,
        side: OrderSide.BUY,
      }),
    ).rejects.toThrow(InvalidInputException);
  });

  it('throws InvalidInputException when a LIMIT order is sent without a price', async () => {
    await expect(
      useCase.execute({
        userId: 1,
        instrumentId: 10,
        type: OrderType.LIMIT,
        side: OrderSide.BUY,
        size: 1,
      }),
    ).rejects.toThrow(InvalidInputException);
  });

  it('throws InvalidInputException when the amount cannot buy at least one share', async () => {
    repo.findFilledOrdersByUser.mockResolvedValue([cashInOrder(1, 100000)]);

    await expect(
      useCase.execute({
        userId: 1,
        instrumentId: 10,
        type: OrderType.MARKET,
        side: OrderSide.BUY,
        amount: 100,
      }),
    ).rejects.toThrow(InvalidInputException);
  });

  it('throws EntityNotFoundException when the instrument does not exist', async () => {
    repo.findInstrumentById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 1,
        instrumentId: 999,
        type: OrderType.MARKET,
        side: OrderSide.BUY,
        size: 1,
      }),
    ).rejects.toThrow(EntityNotFoundException);
  });

  it('throws EntityNotFoundException when the user does not exist', async () => {
    repo.findUserById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 999,
        instrumentId: 10,
        type: OrderType.MARKET,
        side: OrderSide.BUY,
        size: 1,
      }),
    ).rejects.toThrow(EntityNotFoundException);
  });

  it('throws InvalidInputException when a MARKET order has no market data available', async () => {
    repo.findLatestMarketData.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 1,
        instrumentId: 10,
        type: OrderType.MARKET,
        side: OrderSide.BUY,
        size: 1,
      }),
    ).rejects.toThrow(InvalidInputException);
  });

  describe('concurrency', () => {
    it('throws ResourceLockedException on concurrent orders for the same user', async () => {
      const orderDto = {
        userId: 1,
        instrumentId: 10,
        type: OrderType.MARKET,
        side: OrderSide.BUY as const,
        size: 15,
      };

      repo.findFilledOrdersByUser.mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 50));
        return [cashInOrder(1, 10000)];
      });

      const first = useCase.execute(orderDto);
      await new Promise((r) => setImmediate(r));
      const second = useCase.execute(orderDto);

      await expect(second).rejects.toThrow(ResourceLockedException);
      await first;
    });
  });
});
