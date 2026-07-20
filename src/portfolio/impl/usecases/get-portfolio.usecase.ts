import { Injectable, Inject } from '@nestjs/common';
import Big from 'big.js';
import { EntityNotFoundException } from '../../../common/exceptions/domain.exceptions';
import { ZERO, roundMoney } from '../../../common/money';
import { IGetPortfolioUseCase } from '../../interfaces/get-portfolio-usecase.interface';
import {
  PositionResult,
  PortfolioResult,
} from '../../interfaces/portfolio.result';
import { IPortfolioRepositoryToken } from '../../interfaces/portfolio-repository.interface';
import type { IPortfolioRepository } from '../../interfaces/portfolio-repository.interface';
import { ProjectionManager } from '../projection-manager';

@Injectable()
export class GetPortfolioUseCaseImpl implements IGetPortfolioUseCase {
  constructor(
    @Inject(IPortfolioRepositoryToken)
    private readonly portfolioRepo: IPortfolioRepository,
    private readonly projectionManager: ProjectionManager,
  ) {}

  async execute(userId: number): Promise<PortfolioResult> {
    // 1. Project state first — the open positions define exactly which
    // instruments we need market data and metadata for.
    const { availableCash, positions: heldPositions } =
      await this.projectionManager.getProjection(userId);

    const openPositions = [...heldPositions.entries()].filter(
      ([, pos]) => pos.shares !== 0,
    );

    // An empty projection (no open positions, zero cash) is ambiguous: it could
    // be a user who never operated, or one who deposited and later withdrew
    // everything. Only the former is a 404 — a user who did operate has a
    // (zeroed) portfolio, not a missing one. Check activity only in this edge,
    // never on the hot path.
    if (openPositions.length === 0 && availableCash.eq(ZERO())) {
      const hasActivity = await this.portfolioRepo.hasFilledOrders(userId);
      if (!hasActivity) {
        throw new EntityNotFoundException('Portfolio for user', userId);
      }
      return {
        totalAccountValue: roundMoney(ZERO()),
        availableCash: roundMoney(ZERO()),
        positions: [],
      };
    }

    // 2. Fetch prices and ticker/name only for the held instruments, in
    // parallel. Both queries are bounded by the number of open positions —
    // not by the user's order history nor the size of the market.
    const heldIds = openPositions.map(([instId]) => instId);
    const [marketRows, instruments] = await Promise.all([
      this.portfolioRepo.findLatestMarketData(heldIds),
      this.portfolioRepo.findInstrumentsByIds(heldIds),
    ]);

    const marketMap = new Map<number, { close: Big; previousClose: Big }>();
    for (const row of marketRows) {
      marketMap.set(row.instrumentId, {
        close: row.close,
        previousClose: row.previousClose,
      });
    }

    const metaById = new Map<number, { ticker: string; name: string }>();
    for (const inst of instruments) {
      metaById.set(inst.id, { ticker: inst.ticker, name: inst.name });
    }

    const positions: PositionResult[] = [];
    let totalAssetValue = ZERO();

    for (const [instId, pos] of openPositions) {
      const mkt = marketMap.get(instId);
      const currentPrice = mkt ? mkt.close : pos.avgPrice;
      const totalValue = new Big(pos.shares).times(currentPrice);

      let totalReturnPct = ZERO();
      if (pos.shares > 0 && pos.totalCost.gt(0)) {
        totalReturnPct = totalValue
          .minus(pos.totalCost)
          .div(pos.totalCost)
          .times(100);
      } else if (pos.shares < 0 && pos.totalCost.lt(0)) {
        totalReturnPct = pos.avgPrice
          .minus(currentPrice)
          .div(pos.avgPrice)
          .times(100);
      }

      totalAssetValue = totalAssetValue.plus(totalValue);

      const meta = metaById.get(instId);
      positions.push({
        ticker: meta?.ticker ?? '',
        name: meta?.name ?? '',
        shares: pos.shares,
        totalValue: roundMoney(totalValue),
        totalReturnPct: totalReturnPct.round(2).toNumber(),
      });
    }

    const totalAccountValue = availableCash.plus(totalAssetValue);

    return {
      totalAccountValue: roundMoney(totalAccountValue),
      availableCash: roundMoney(availableCash),
      positions,
    };
  }
}
