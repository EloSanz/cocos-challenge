import Big from 'big.js';
import { SnapshotConverter } from './snapshot-converter';
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

describe('SnapshotConverter', () => {
  it('round-trips totalCost exactly and recomputes avgPrice from it', () => {
    const positions = new Map([
      [10, { shares: 7, totalCost: new Big('500'), avgPrice: new Big('123') }],
    ]);

    const jsonb = SnapshotConverter.toJsonb(positions);
    // avgPrice is not persisted.
    expect(jsonb['10']).toEqual({ shares: 7, totalCost: '500.00' });

    const restored = SnapshotConverter.fromJsonb(jsonb).get(10)!;
    expect(restored.shares).toBe(7);
    expect(restored.totalCost.toFixed(2)).toBe('500.00');
    // Recomputed, not truncated: 500 / 7 = 71.428571...
    expect(restored.avgPrice.eq(new Big('500').div(7))).toBe(true);
  });

  it('drops fully-closed (shares === 0) positions', () => {
    const positions = new Map([
      [10, { shares: 0, totalCost: new Big('0'), avgPrice: new Big('0') }],
      [20, { shares: 5, totalCost: new Big('250'), avgPrice: new Big('50') }],
    ]);

    const jsonb = SnapshotConverter.toJsonb(positions);
    expect(jsonb['10']).toBeUndefined();
    expect(jsonb['20']).toBeDefined();
  });

  it('handles short positions (negative shares / negative totalCost)', () => {
    const positions = new Map([
      [
        10,
        { shares: -10, totalCost: new Big('-1000'), avgPrice: new Big('100') },
      ],
    ]);

    const restored = SnapshotConverter.fromJsonb(
      SnapshotConverter.toJsonb(positions),
    ).get(10)!;
    expect(restored.shares).toBe(-10);
    expect(restored.avgPrice.toNumber()).toBe(100); // -1000 / -10
  });

  it('a snapshot boundary produces the SAME result as a full scan (precision invariant)', () => {
    // avgPrice here repeats: 500 / 7 = 71.428571... — the case that used to
    // drift when avgPrice was persisted as toFixed(2).
    const early = [
      order(OrderSide.CASH_IN, 100000, 1, 66),
      order(OrderSide.BUY, 3, 100),
      order(OrderSide.BUY, 4, 50),
    ];
    const late = [order(OrderSide.SELL, 2, 80)];

    // Path A: full scan over all orders at once.
    const fullScan = projectAccount([...early, ...late]);

    // Path B: snapshot the early orders, persist to JSONB, reload, continue.
    const snap = projectAccount(early);
    const reloaded = {
      availableCash: snap.availableCash,
      positions: SnapshotConverter.fromJsonb(
        SnapshotConverter.toJsonb(snap.positions),
      ),
    };
    const viaSnapshot = projectAccount(late, reloaded);

    expect(viaSnapshot.availableCash.toFixed(2)).toBe(
      fullScan.availableCash.toFixed(2),
    );
    const a = fullScan.positions.get(10)!;
    const b = viaSnapshot.positions.get(10)!;
    expect(b.shares).toBe(a.shares);
    expect(b.totalCost.toFixed(2)).toBe(a.totalCost.toFixed(2));
  });
});
