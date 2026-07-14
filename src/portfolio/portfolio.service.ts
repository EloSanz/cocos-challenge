import { Injectable, NotFoundException } from '@nestjs/common';
import { PortfolioRepository } from './portfolio.repository';
import { OrderSide } from '../database/enums/order.enum';

export interface PositionDto {
  ticker: string;
  name: string;
  shares: number;
  totalValue: number;
  totalReturnPct: number;
}

export interface PortfolioResponseDto {
  totalAccountValue: number;
  availableCash: number;
  positions: PositionDto[];
}

@Injectable()
export class PortfolioService {
  constructor(private readonly portfolioRepo: PortfolioRepository) {}

  async getUserPortfolio(userId: number): Promise<PortfolioResponseDto> {
    // 1. Fetch filled orders and market data from database using TypeORM
    const [orders, marketRows] = await Promise.all([
      this.portfolioRepo.findFilledOrdersByUser(userId),
      this.portfolioRepo.findLatestMarketData(),
    ]);

    // If no orders at all, it could mean the user does not exist or has no activity
    if (orders.length === 0) {
      throw new NotFoundException(
        `No portfolio data found for user ID ${userId}`,
      );
    }

    // 2. Map latest market prices by instrument ID
    const marketMap = new Map<
      number,
      { close: number; previousClose: number }
    >();
    for (const row of marketRows) {
      marketMap.set(row.instrumentId, {
        close: parseFloat(row.close),
        previousClose: parseFloat(row.previousClose),
      });
    }

    // 3. Process orders to compute cash and positions
    let availableCash = 0;
    // Map instrument ID to running position stats
    const positionsMap = new Map<
      number,
      {
        ticker: string;
        name: string;
        shares: number;
        totalCost: number;
        avgPrice: number;
      }
    >();

    for (const order of orders) {
      const size = parseInt(order.size, 10);
      const price = parseFloat(order.price);
      const instId = order.instrumentId;
      const instrument = order.instrument;

      if (!instrument) {
        continue; // Safeguard if instrument relation is not loaded
      }

      if (order.side === OrderSide.CASH_IN) {
        availableCash += size * price;
      } else if (order.side === OrderSide.CASH_OUT) {
        availableCash -= size * price;
      } else if (order.side === OrderSide.BUY) {
        availableCash -= size * price;

        if (!positionsMap.has(instId)) {
          positionsMap.set(instId, {
            ticker: instrument.ticker,
            name: instrument.name,
            shares: 0,
            totalCost: 0,
            avgPrice: 0,
          });
        }
        const pos = positionsMap.get(instId)!;
        pos.shares += size;
        pos.totalCost += size * price;
        pos.avgPrice = pos.totalCost / pos.shares;
      } else if (order.side === OrderSide.SELL) {
        availableCash += size * price;

        if (!positionsMap.has(instId)) {
          positionsMap.set(instId, {
            ticker: instrument.ticker,
            name: instrument.name,
            shares: 0,
            totalCost: 0,
            avgPrice: 0,
          });
        }
        const pos = positionsMap.get(instId)!;
        pos.shares -= size;
        pos.totalCost = pos.shares * pos.avgPrice; // Reduce total cost basis proportionally
      }
    }

    // 4. Calculate current values and returns
    const positions: PositionDto[] = [];
    let totalAssetValue = 0;

    for (const [instId, pos] of positionsMap.entries()) {
      if (pos.shares === 0) {
        continue; // Skip closed positions
      }

      const mkt = marketMap.get(instId);
      const currentPrice = mkt ? mkt.close : pos.avgPrice;
      const totalValue = pos.shares * currentPrice;

      let totalReturnPct = 0;
      if (pos.shares > 0 && pos.totalCost > 0) {
        totalReturnPct = ((totalValue - pos.totalCost) / pos.totalCost) * 100;
      } else if (pos.shares < 0 && pos.totalCost < 0) {
        // For short positions, return is positive if price decreased
        totalReturnPct = ((pos.avgPrice - currentPrice) / pos.avgPrice) * 100;
      }

      totalAssetValue += totalValue;

      positions.push({
        ticker: pos.ticker,
        name: pos.name,
        shares: pos.shares,
        totalValue: parseFloat(totalValue.toFixed(2)),
        totalReturnPct: parseFloat(totalReturnPct.toFixed(2)),
      });
    }

    const totalAccountValue = availableCash + totalAssetValue;

    return {
      totalAccountValue: parseFloat(totalAccountValue.toFixed(2)),
      availableCash: parseFloat(availableCash.toFixed(2)),
      positions,
    };
  }
}
