import { describe, it, expect } from 'vitest';
import { currentUtcPeriod, isValidPeriod } from '../period.util';

describe('period.util', () => {
  describe('currentUtcPeriod', () => {
    it('formats a UTC date as YYYY-MM', () => {
      expect(currentUtcPeriod(new Date('2026-08-17T12:00:00.000Z'))).toBe('2026-08');
    });

    it('pads single-digit months', () => {
      expect(currentUtcPeriod(new Date('2026-01-05T00:00:00.000Z'))).toBe('2026-01');
    });

    it('uses the UTC month, not the local one, at a month boundary', () => {
      // 23:30 UTC on the 31st is still August in UTC even if local time has
      // already rolled into September — this is exactly the boundary DARE2CARE-12
      // and DARE2CARE-13 must agree on.
      expect(currentUtcPeriod(new Date('2026-08-31T23:30:00.000Z'))).toBe('2026-08');
      expect(currentUtcPeriod(new Date('2026-09-01T00:00:00.000Z'))).toBe('2026-09');
    });

    it('defaults to now when no date is supplied', () => {
      const before = currentUtcPeriod();
      expect(before).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('isValidPeriod', () => {
    it.each(['2026-01', '2026-12', '1999-06'])('accepts %s', (p) => {
      expect(isValidPeriod(p)).toBe(true);
    });

    it.each(['2026-00', '2026-13', '2026-1', '26-01', '2026/01', ''])('rejects %s', (p) => {
      expect(isValidPeriod(p)).toBe(false);
    });
  });
});
