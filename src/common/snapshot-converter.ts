import Big from 'big.js';
import { ProjectedPosition } from './account-projection';
import { ZERO } from './money';

/**
 * Persisted shape of a position inside the snapshot JSONB.
 *
 * `avgPrice` is intentionally NOT stored: the invariant `avgPrice ===
 * totalCost / shares` holds at every step of `projectAccount` (BUY computes it
 * that way; SELL sets `totalCost = shares * avgPrice`). Since `totalCost` is
 * always exact to 2dp (a sum of `price[2dp] * size[int]`) while `avgPrice` may
 * repeat (e.g. 500/7), storing `avgPrice` would truncate precision and let the
 * snapshotted numbers drift from the full-scan path. We recompute it on load
 * from the two exact fields instead.
 */
type JsonbPosition = {
  shares: number;
  totalCost: string;
};

export class SnapshotConverter {
  static toJsonb(
    positions: Map<number, ProjectedPosition>,
  ): Record<string, JsonbPosition> {
    const result: Record<string, JsonbPosition> = {};
    for (const [instId, pos] of positions) {
      // Skip fully-closed positions: they contribute nothing and would grow
      // the JSONB unbounded with every instrument ever traded.
      if (pos.shares === 0) continue;
      result[instId.toString()] = {
        shares: pos.shares,
        totalCost: pos.totalCost.toFixed(2),
      };
    }
    return result;
  }

  static fromJsonb(
    jsonb: Record<string, JsonbPosition>,
  ): Map<number, ProjectedPosition> {
    const positions = new Map<number, ProjectedPosition>();
    for (const [instIdStr, pos] of Object.entries(jsonb)) {
      const instId = parseInt(instIdStr, 10);
      const totalCost = new Big(pos.totalCost);
      const avgPrice = pos.shares === 0 ? ZERO() : totalCost.div(pos.shares);
      positions.set(instId, {
        shares: pos.shares,
        totalCost,
        avgPrice,
      });
    }
    return positions;
  }
}
