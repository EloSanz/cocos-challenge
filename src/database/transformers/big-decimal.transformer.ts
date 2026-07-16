import { ValueTransformer } from 'typeorm';
import Big from 'big.js';

/**
 * Maps a Postgres `numeric` column (returned as a string by node-pg to avoid
 * float precision loss) to a `Big` decimal in the domain, and back to a
 * fixed-2dp string on write. Entities expose `Big`, so no layer ever does
 * `parseFloat` on money.
 */
export const bigDecimalTransformer: ValueTransformer = {
  to: (value?: Big | null): string | null | undefined =>
    value == null ? value : value.toFixed(2),
  from: (value?: string | null): Big | null | undefined =>
    value == null ? value : new Big(value),
};
