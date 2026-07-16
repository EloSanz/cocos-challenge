import Big from 'big.js';
import { projectAccount } from './account-projection';
import { Order } from '../database/entities/order.entity';
import { OrderSide, OrderStatus } from '../database/enums/order.enum';

function order(
  side: OrderSide,
  size: number,
  price: number,
  instrumentId = 10,
): Order {
  return {
    instrumentId,
    side,
    size,
    price: new Big(price),
    status: OrderStatus.FILLED,
  } as Order;
}

describe('projectAccount', () => {
  it('returns zero cash and no positions for an empty log', () => {
    const { availableCash, positions } = projectAccount([]);
    expect(availableCash.toNumber()).toBe(0);
    expect(positions.size).toBe(0);
  });

  it('adds and subtracts cash for CASH_IN / CASH_OUT without creating positions', () => {
    const { availableCash, positions } = projectAccount([
      order(OrderSide.CASH_IN, 100000, 1, 66),
      order(OrderSide.CASH_OUT, 30000, 1, 66),
    ]);
    expect(availableCash.toNumber()).toBe(70000);
    expect(positions.size).toBe(0);
  });

  it('accumulates shares and cost basis on BUY and debits cash', () => {
    const { availableCash, positions } = projectAccount([
      order(OrderSide.CASH_IN, 100000, 1, 66),
      order(OrderSide.BUY, 10, 500),
    ]);
    expect(availableCash.toNumber()).toBe(95000);
    const pos = positions.get(10)!;
    expect(pos.shares).toBe(10);
    expect(pos.totalCost.toNumber()).toBe(5000);
    expect(pos.avgPrice.toNumber()).toBe(500);
  });

  it('averages the acquisition price across multiple BUYs', () => {
    const { positions } = projectAccount([
      order(OrderSide.BUY, 10, 100),
      order(OrderSide.BUY, 10, 200),
    ]);
    const pos = positions.get(10)!;
    expect(pos.shares).toBe(20);
    expect(pos.totalCost.toNumber()).toBe(3000);
    expect(pos.avgPrice.toNumber()).toBe(150);
  });

  it('reduces shares and credits cash on SELL, holding the average price', () => {
    const { availableCash, positions } = projectAccount([
      order(OrderSide.BUY, 10, 100),
      order(OrderSide.SELL, 4, 130),
    ]);
    // cash: -1000 (buy) + 520 (sell) = -480
    expect(availableCash.toNumber()).toBe(-480);
    const pos = positions.get(10)!;
    expect(pos.shares).toBe(6);
    expect(pos.totalCost.toNumber()).toBe(600); // 6 * avgPrice(100)
    expect(pos.avgPrice.toNumber()).toBe(100);
  });

  it('keeps decimal precision that IEEE-754 floats would lose', () => {
    // 0.1 + 0.2 !== 0.3 in float; Big keeps it exact.
    const { availableCash } = projectAccount([
      order(OrderSide.CASH_IN, 1, 0.1, 66),
      order(OrderSide.CASH_IN, 1, 0.2, 66),
    ]);
    expect(availableCash.toString()).toBe('0.3');
  });

  it('models a short position when SELL happens without prior holdings', () => {
    const { positions } = projectAccount([order(OrderSide.SELL, 10, 500)]);
    const pos = positions.get(10)!;
    expect(pos.shares).toBe(-10);
    expect(pos.totalCost.toNumber()).toBe(0);
    expect(pos.avgPrice.toNumber()).toBe(0);
  });

  it('keeps positions independent per instrument', () => {
    const { positions } = projectAccount([
      order(OrderSide.BUY, 5, 100, 10),
      order(OrderSide.BUY, 3, 200, 20),
    ]);
    expect(positions.get(10)?.shares).toBe(5);
    expect(positions.get(20)?.shares).toBe(3);
  });
});
