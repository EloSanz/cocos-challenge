import { Injectable, Inject } from '@nestjs/common';
import Big from 'big.js';
import { EntityNotFoundException } from '../../../common/exceptions/domain.exceptions';
import { projectAccount } from '../../../common/account-projection';
import { ZERO, roundMoney } from '../../../common/money';
import { IGetPortfolioUseCase } from '../../interfaces/get-portfolio-usecase.interface';
import {
  PositionResult,
  PortfolioResult,
} from '../../interfaces/portfolio.result';
import { IPortfolioRepositoryToken } from '../../interfaces/portfolio-repository.interface';
import type { IPortfolioRepository } from '../../interfaces/portfolio-repository.interface';

@Injectable()
export class GetPortfolioUseCaseImpl implements IGetPortfolioUseCase {
  constructor(
    @Inject(IPortfolioRepositoryToken)
    private readonly portfolioRepo: IPortfolioRepository,
  ) {}

  async execute(userId: number): Promise<PortfolioResult> {
    // 1. Fetch filled orders and market data from database using Repository
    const [orders, marketRows] = await Promise.all([
      this.portfolioRepo.findFilledOrdersByUser(userId),
      this.portfolioRepo.findLatestMarketData(),
    ]);

    // If no orders at all, it could mean the user does not exist or has no activity
    if (orders.length === 0) {
      throw new EntityNotFoundException('Portfolio for user', userId);
    }

    // 2. Map latest market prices by instrument ID
    const marketMap = new Map<number, { close: Big; previousClose: Big }>();
    for (const row of marketRows) {
      marketMap.set(row.instrumentId, {
        close: row.close,
        previousClose: row.previousClose,
      });
    }

    // 3. Derive cash and holdings from the FILLED-order log (shared with the
    // order funds check, so both views stay consistent).
    const { availableCash, positions: heldPositions } = projectAccount(orders);

    // Instrument metadata (ticker/name) comes from the loaded relation.
    const metaById = new Map<number, { ticker: string; name: string }>();
    for (const order of orders) {
      if (order.instrument && !metaById.has(order.instrumentId)) {
        metaById.set(order.instrumentId, {
          ticker: order.instrument.ticker,
          name: order.instrument.name,
        });
      }
    }

    // 4. Enrich each open position with current market value and return.
    const positions: PositionResult[] = [];
    let totalAssetValue = ZERO();

    for (const [instId, pos] of heldPositions.entries()) {
      if (pos.shares === 0) {
        continue; // Skip closed positions
      }

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
        // For short positions, return is positive if price decreased.
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
