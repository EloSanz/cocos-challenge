import Big from 'big.js';

/** Zero as a fresh Big (Big is immutable, but this reads clearly at call sites). */
export const ZERO = (): Big => new Big(0);

/**
 * Single rounding policy for money leaving the domain toward the transport
 * layer: round to 2 decimals and expose as a plain number for JSON.
 */
export const roundMoney = (value: Big): number => value.round(2).toNumber();
