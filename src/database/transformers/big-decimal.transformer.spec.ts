import Big from 'big.js';
import { bigDecimalTransformer } from './big-decimal.transformer';

describe('bigDecimalTransformer', () => {
  describe('from (DB string → Big)', () => {
    it('parses a numeric string into a Big', () => {
      const value = bigDecimalTransformer.from('925.85') as Big;
      expect(value).toBeInstanceOf(Big);
      expect(value.toString()).toBe('925.85');
    });

    it('passes null/undefined through', () => {
      expect(bigDecimalTransformer.from(null)).toBeNull();
      expect(bigDecimalTransformer.from(undefined)).toBeUndefined();
    });
  });

  describe('to (Big → DB string, fixed 2dp)', () => {
    it('serializes a Big to a 2-decimal string', () => {
      expect(bigDecimalTransformer.to(new Big('500'))).toBe('500.00');
      expect(bigDecimalTransformer.to(new Big('925.8'))).toBe('925.80');
    });

    it('passes null/undefined through', () => {
      expect(bigDecimalTransformer.to(null)).toBeNull();
      expect(bigDecimalTransformer.to(undefined)).toBeUndefined();
    });
  });

  it('round-trips a value losslessly', () => {
    const original = '1234567.89';
    const big = bigDecimalTransformer.from(original) as Big;
    expect(bigDecimalTransformer.to(big)).toBe(original);
  });
});
