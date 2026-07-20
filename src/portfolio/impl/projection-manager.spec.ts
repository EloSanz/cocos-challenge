import { Test, TestingModule } from '@nestjs/testing';
import Big from 'big.js';
import { ProjectionManager } from './projection-manager';
import { IPortfolioRepositoryToken } from '../interfaces/portfolio-repository.interface';
import { IMutexToken } from '../../common/interfaces/mutex.interface';
import { ResourceLockedException } from '../../common/exceptions/domain.exceptions';
import { OrderSide, OrderStatus } from '../../database/enums/order.enum';

function filledOrder(id: number, side: OrderSide, size: number, price: number) {
  return {
    id,
    instrumentId: 10,
    side,
    size,
    price: new Big(price),
    status: OrderStatus.FILLED,
  };
}

describe('ProjectionManager.updateSnapshot (concurrency guard)', () => {
  let manager: ProjectionManager;
  const release = jest.fn();

  const mockRepo = {
    findFilledOrdersByUser: jest.fn(),
    findLatestMarketData: jest.fn(),
    findInstrumentsByIds: jest.fn(),
    findSnapshotByUser: jest.fn(),
    saveSnapshot: jest.fn(),
    findFilledOrdersAfter: jest.fn(),
    hasFilledOrders: jest.fn(),
  };
  const mockLocks = { acquire: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockLocks.acquire.mockResolvedValue(release);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectionManager,
        { provide: IPortfolioRepositoryToken, useValue: mockRepo },
        { provide: IMutexToken, useValue: mockLocks },
      ],
    }).compile();

    manager = module.get<ProjectionManager>(ProjectionManager);
  });

  it('acquires the per-user snapshot lock, saves, and releases it', async () => {
    mockRepo.findSnapshotByUser.mockResolvedValue(null);
    mockRepo.findFilledOrdersAfter.mockResolvedValue([
      filledOrder(1, OrderSide.CASH_IN, 1000, 1),
    ]);

    await manager.updateSnapshot(7);

    expect(mockLocks.acquire).toHaveBeenCalledWith('snapshot:7');
    expect(mockRepo.saveSnapshot).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('skips silently (no DB read/write) when another update holds the lock', async () => {
    mockLocks.acquire.mockRejectedValue(
      new ResourceLockedException('Resource snapshot:7'),
    );

    await expect(manager.updateSnapshot(7)).resolves.toBeUndefined();

    expect(mockRepo.findSnapshotByUser).not.toHaveBeenCalled();
    expect(mockRepo.saveSnapshot).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
  });

  it('releases the lock even if the save throws', async () => {
    mockRepo.findSnapshotByUser.mockResolvedValue(null);
    mockRepo.findFilledOrdersAfter.mockResolvedValue([
      filledOrder(1, OrderSide.CASH_IN, 1000, 1),
    ]);
    mockRepo.saveSnapshot.mockRejectedValue(new Error('db down'));

    await expect(manager.updateSnapshot(7)).rejects.toThrow('db down');
    expect(release).toHaveBeenCalledTimes(1);
  });
});
