import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Big from 'big.js';
import {
  EntityNotFoundException,
  InvalidInputException,
  ResourceLockedException,
} from '../../../common/exceptions/domain.exceptions';
import { CreateOrderUseCaseImpl } from './create-order.usecase';
import { ProjectionManager } from '../../../portfolio/impl/projection-manager';
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
  let projectionManager: jest.Mocked<ProjectionManager>;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderUseCaseImpl,
        {
          provide: IMutexToken,
          useClass: KeyedMutex,
        },
        {
          provide: ProjectionManager,
          useValue: { getProjection: jest.fn() },
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
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
            emitAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(CreateOrderUseCaseImpl);
    repo = module.get(IOrdersRepositoryToken);
    projectionManager = module.get(ProjectionManager);

    repo.findUserById.mockResolvedValue(user);
    repo.findInstrumentById.mockResolvedValue(instrument);
    repo.findLatestMarketData.mockResolvedValue(marketData);
    repo.createOrder.mockImplementation((data) =>
      Promise.resolve({ id: 1, ...data } as unknown as Order),
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('fills a MARKET BUY order at the latest close price when cash is sufficient', async () => {
    projectionManager.getProjection.mockResolvedValue({
      availableCash: new Big(100000),
      positions: new Map(),
    });

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
    projectionManager.getProjection.mockResolvedValue({
      availableCash: new Big(1000),
      positions: new Map(),
    });

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
    projectionManager.getProjection.mockResolvedValue({
      availableCash: new Big(100000),
      positions: new Map(),
    });

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
    projectionManager.getProjection.mockResolvedValue({
      availableCash: new Big(100000),
      positions: new Map([
        [10, { shares: 5, totalCost: new Big(2500), avgPrice: new Big(500) }],
      ]),
    });

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
    projectionManager.getProjection.mockResolvedValue({
      availableCash: new Big(100000),
      positions: new Map([
        [10, { shares: 10, totalCost: new Big(5000), avgPrice: new Big(500) }],
      ]),
    });

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
    projectionManager.getProjection.mockResolvedValue({
      availableCash: new Big(100000),
      positions: new Map(),
    });

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
    projectionManager.getProjection.mockResolvedValue({
      availableCash: new Big(100000),
      positions: new Map(),
    });

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

      projectionManager.getProjection.mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 50));
        return { availableCash: new Big(10000), positions: new Map() };
      });

      const first = useCase.execute(orderDto);
      await new Promise((r) => setImmediate(r));
      const second = useCase.execute(orderDto);

      await expect(second).rejects.toThrow(ResourceLockedException);
      await first;
    });
  });
});
