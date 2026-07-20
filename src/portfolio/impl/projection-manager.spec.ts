import { Test, TestingModule } from '@nestjs/testing';
import Big from 'big.js';
import { ProjectionManager } from './projection-manager';
import { ZERO } from '../../common/money';
import { IPortfolioRepositoryToken } from '../interfaces/portfolio-repository.interface';
import { IMutexToken } from '../../common/interfaces/mutex.interface';
import { ResourceLockedException } from '../../common/exceptions/domain.exceptions';
import { OrderSide, OrderStatus } from '../../database/enums/order.enum';

function filledOrder(
  id: number,
  side: OrderSide,
  size: number,
  price: number,
  instrumentId = 10,
) {
  return {
    id,
    instrumentId,
    side,
    size,
    price: new Big(price),
    status: OrderStatus.FILLED,
  };
}

describe('ProjectionManager', () => {
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

  describe('updateSnapshot (concurrency guard)', () => {
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

  describe('getProjection', () => {
    it('falls back to a full scan when no snapshot exists yet', async () => {
      mockRepo.findSnapshotByUser.mockResolvedValue(null);
      mockRepo.findFilledOrdersByUser.mockResolvedValue([
        filledOrder(1, OrderSide.CASH_IN, 1000, 1, 66),
        filledOrder(2, OrderSide.BUY, 5, 100, 2),
      ]);

      const { availableCash, positions } = await manager.getProjection(1);

      // No snapshot => the delta query is never used.
      expect(mockRepo.findFilledOrdersAfter).not.toHaveBeenCalled();
      expect(availableCash.toNumber()).toBe(500); // 1000 - 5*100
      const pos = positions.get(2)!;
      expect(pos.shares).toBe(5);
      expect(pos.totalCost.toNumber()).toBe(500);
      expect(pos.avgPrice.toNumber()).toBe(100);
    });

    it('should rethrow errors that are not ResourceLockedException during updateSnapshot', async () => {
      const error = new Error('Database error');
      mockLocks.acquire.mockRejectedValue(error);
      await expect(manager.updateSnapshot(1)).rejects.toThrow('Database error');
    });

    it('should exit early in updateSnapshot if ordersToProcess is empty', async () => {
      mockLocks.acquire.mockResolvedValue(jest.fn());
      mockRepo.findSnapshotByUser.mockResolvedValue({
        userId: 1,
        lastOrderId: 10,
        availableCash: ZERO(),
        positions: {},
      });
      mockRepo.findFilledOrdersAfter.mockResolvedValue([]);
      await manager.updateSnapshot(1);
      expect(mockRepo.saveSnapshot).not.toHaveBeenCalled();
    });

    it('returns the snapshot as-is when no orders were filled after it', async () => {
      mockRepo.findSnapshotByUser.mockResolvedValue({
        userId: 1,
        lastOrderId: 2,
        availableCash: new Big('500'),
        positions: { '2': { shares: 5, totalCost: '500.00' } },
      });
      mockRepo.findFilledOrdersAfter.mockResolvedValue([]);

      const { availableCash, positions } = await manager.getProjection(1);

      expect(mockRepo.findFilledOrdersByUser).not.toHaveBeenCalled();
      expect(availableCash.toNumber()).toBe(500);
      const pos = positions.get(2)!;
      expect(pos.shares).toBe(5);
      expect(pos.totalCost.toNumber()).toBe(500);
      // avgPrice recomputed from totalCost/shares, not persisted.
      expect(pos.avgPrice.toNumber()).toBe(100);
    });

    it('merges orders filled after the snapshot on the fly (strong consistency)', async () => {
      // Snapshot: 10 AAPL @ 150 bought, cash 8500 (after a 10000 cash-in).
      mockRepo.findSnapshotByUser.mockResolvedValue({
        userId: 1,
        lastOrderId: 2,
        availableCash: new Big('8500'),
        positions: { '2': { shares: 10, totalCost: '1500.00' } },
      });
      // A newer BUY the async listener has not folded into the snapshot yet.
      mockRepo.findFilledOrdersAfter.mockResolvedValue([
        filledOrder(3, OrderSide.BUY, 10, 200, 2),
      ]);

      const { availableCash, positions } = await manager.getProjection(1);

      expect(mockRepo.findFilledOrdersAfter).toHaveBeenCalledWith(1, 2);
      // 8500 - 10*200 = 6500
      expect(availableCash.toNumber()).toBe(6500);
      const pos = positions.get(2)!;
      // 10 (snapshot) + 10 (pending) = 20 shares
      expect(pos.shares).toBe(20);
      // 1500 + 2000 = 3500 cost basis
      expect(pos.totalCost.toNumber()).toBe(3500);
      // 3500 / 20 = 175 average price
      expect(pos.avgPrice.toNumber()).toBe(175);
    });
  });
});
