import Big from 'big.js';
import { Order } from '../database/entities/order.entity';
import { OrderSide } from '../database/enums/order.enum';
import { ZERO } from './money';

export interface ProjectedPosition {
  /** Net shares currently held (negative for short positions). */
  shares: number;
  /** Cost basis of the current holding, in pesos. */
  totalCost: Big;
  /** Average acquisition price per share. */
  avgPrice: Big;
}

export interface AccountProjection {
  availableCash: Big;
  /** instrumentId -> position. Only instruments that were ever traded appear. */
  positions: Map<number, ProjectedPosition>;
}

/**
 * Single source of truth for how cash and holdings are derived from the
 * FILLED-order log.
 *
 * Both the portfolio (read path) and the order funds/holdings check (write
 * path) fold over the same orders with the same semantics. Keeping that fold
 * here prevents the two paths from drifting: if a new `side` is added, it is
 * handled in exactly one place, so the balance a user sees and the balance an
 * order is validated against can never disagree.
 *
 * All money is kept in `Big` decimals — never IEEE-754 floats.
 */
export function projectAccount(filledOrders: Order[]): AccountProjection {
  let availableCash = ZERO();
  const positions = new Map<number, ProjectedPosition>();

  const positionFor = (instrumentId: number): ProjectedPosition => {
    let pos = positions.get(instrumentId);
    if (!pos) {
      pos = { shares: 0, totalCost: ZERO(), avgPrice: ZERO() };
      positions.set(instrumentId, pos);
    }
    return pos;
  };

  for (const order of filledOrders) {
    const size = order.size;
    const value = order.price.times(size);

    switch (order.side) {
      case OrderSide.CASH_IN:
        availableCash = availableCash.plus(value);
        break;
      case OrderSide.CASH_OUT:
        availableCash = availableCash.minus(value);
        break;
      case OrderSide.BUY: {
        availableCash = availableCash.minus(value);
        const pos = positionFor(order.instrumentId);
        pos.shares += size;
        pos.totalCost = pos.totalCost.plus(value);
        pos.avgPrice = pos.totalCost.div(pos.shares);
        break;
      }
      case OrderSide.SELL: {
        availableCash = availableCash.plus(value);
        const pos = positionFor(order.instrumentId);
        pos.shares -= size;
        // Reduce the cost basis proportionally, holding the average price.
        // No shares or no average price ⇒ no cost basis (avoids a signed -0).
        pos.totalCost =
          pos.shares === 0 || pos.avgPrice.eq(0)
            ? ZERO()
            : new Big(pos.shares).times(pos.avgPrice);
        break;
      }
    }
  }

  return { availableCash, positions };
}
