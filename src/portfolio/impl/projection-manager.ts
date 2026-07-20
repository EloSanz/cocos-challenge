import { Injectable, Inject } from '@nestjs/common';
import { PortfolioSnapshot } from '../../database/entities/portfolio-snapshot.entity';
import {
  projectAccount,
  AccountProjection,
} from '../../common/account-projection';
import { SnapshotConverter } from '../../common/snapshot-converter';
import { ZERO } from '../../common/money';
import { ResourceLockedException } from '../../common/exceptions/domain.exceptions';
import { IPortfolioRepositoryToken } from '../interfaces/portfolio-repository.interface';
import type { IPortfolioRepository } from '../interfaces/portfolio-repository.interface';
import { IMutexToken } from '../../common/interfaces/mutex.interface';
import type { IMutex } from '../../common/interfaces/mutex.interface';

@Injectable()
export class ProjectionManager {
  constructor(
    @Inject(IPortfolioRepositoryToken)
    private readonly portfolioRepo: IPortfolioRepository,
    @Inject(IMutexToken)
    private readonly locks: IMutex,
  ) {}

  async updateSnapshot(userId: number): Promise<void> {
    // Serialize snapshot writes per user so two near-simultaneous fills can't
    // both read the same snapshot and overwrite each other (lost update). The
    // mutex is fail-fast: if another update for this user is already running,
    // skip — it reads current DB state, so it already covers our order (any
    // rare gap self-heals on the next event, and reads stay correct via the
    // pending-orders projection).
    let release: () => void | Promise<void>;
    try {
      release = await this.locks.acquire(`snapshot:${userId}`);
    } catch (error) {
      if (error instanceof ResourceLockedException) {
        return;
      }
      throw error;
    }

    try {
      let snapshot = await this.portfolioRepo.findSnapshotByUser(userId);

      if (!snapshot) {
        snapshot = new PortfolioSnapshot();
        snapshot.userId = userId;
        snapshot.lastOrderId = 0;
        snapshot.availableCash = ZERO();
        snapshot.positions = {};
        snapshot.version = 0;
      }

      const ordersToProcess = await this.portfolioRepo.findFilledOrdersAfter(
        userId,
        snapshot.lastOrderId,
      );

      if (ordersToProcess.length === 0) {
        return;
      }

      const currentState: AccountProjection = {
        availableCash: snapshot.availableCash,
        positions: SnapshotConverter.fromJsonb(snapshot.positions),
      };

      const updated = projectAccount(ordersToProcess, currentState);

      snapshot.availableCash = updated.availableCash;
      snapshot.positions = SnapshotConverter.toJsonb(updated.positions);
      snapshot.lastOrderId = ordersToProcess[ordersToProcess.length - 1].id;
      snapshot.version += 1;

      await this.portfolioRepo.saveSnapshot(snapshot);
    } finally {
      await release();
    }
  }

  async getProjection(userId: number): Promise<AccountProjection> {
    const snapshot = await this.portfolioRepo.findSnapshotByUser(userId);

    if (!snapshot) {
      const orders = await this.portfolioRepo.findFilledOrdersByUser(userId);
      return projectAccount(orders);
    }

    const currentState: AccountProjection = {
      availableCash: snapshot.availableCash,
      positions: SnapshotConverter.fromJsonb(snapshot.positions),
    };

    const ordersToProcess = await this.portfolioRepo.findFilledOrdersAfter(
      userId,
      snapshot.lastOrderId,
    );

    if (ordersToProcess.length === 0) {
      return currentState;
    }

    return projectAccount(ordersToProcess, currentState);
  }
}
