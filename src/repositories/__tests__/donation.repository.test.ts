import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { DonationRepository } from '../donation.repository';

/**
 * DonationRepository — money-as-string, void filtering, and the ADR-0004
 * "never `include: { user: true }`" rule.
 *
 * A hand-rolled fake Prisma client is used (not a real DB) so every test
 * asserts the EXACT query shape sent to Prisma — which is what actually
 * proves defect #3/#4 (float money) and the ADR-0004 passwordHash-leak rule
 * are fixed, not just that some plausible-looking number comes back.
 */
function buildFakePrisma() {
  return {
    donation: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn().mockResolvedValue([]),
    },
  };
}

describe('DonationRepository', () => {
  let prisma: ReturnType<typeof buildFakePrisma>;
  let repo: DonationRepository;

  beforeEach(() => {
    prisma = buildFakePrisma();
    repo = new DonationRepository(prisma as any);
  });

  describe('summary() — money must never be cast to a JS number', () => {
    it('returns every total as a Decimal-precise string, not a float-rounded number', async () => {
      // A value that famously breaks under Number(...) round-tripping.
      const precise = new Prisma.Decimal('12345678.91');

      prisma.donation.aggregate
        .mockResolvedValueOnce({ _sum: { amount: precise }, _count: 3 }) // allTime
        .mockResolvedValueOnce({ _sum: { amount: precise } }) // month-to-date
        .mockResolvedValueOnce({ _sum: { amount: precise } }); // year-to-date
      prisma.donation.count.mockResolvedValueOnce(2); // pendingCount
      prisma.donation.groupBy.mockResolvedValueOnce([
        { paymentType: 'DONATION', _sum: { amount: precise } },
      ]);

      const summary = await repo.summary();

      expect(summary.totalReceived).toBe('12345678.91');
      expect(typeof summary.totalReceived).toBe('string');
      expect(summary.monthToDate).toBe('12345678.91');
      expect(summary.yearToDate).toBe('12345678.91');
      expect(summary.byType[0].amount).toBe('12345678.91');
      expect(typeof summary.byType[0].amount).toBe('string');
    });

    it('excludes voided and soft-deleted rows from every aggregate', async () => {
      prisma.donation.aggregate.mockResolvedValue({ _sum: { amount: null }, _count: 0 });
      prisma.donation.count.mockResolvedValue(0);
      prisma.donation.groupBy.mockResolvedValue([]);

      await repo.summary();

      const allTimeWhere = prisma.donation.aggregate.mock.calls[0][0].where;
      expect(allTimeWhere).toMatchObject({ status: 'COMPLETED', isDeleted: false, voidedAt: null });

      const pendingWhere = prisma.donation.count.mock.calls[0][0].where;
      expect(pendingWhere).toMatchObject({ status: 'PENDING', isDeleted: false, voidedAt: null });
    });

    it('defaults a null sum to "0.00" rather than "null" or NaN', async () => {
      prisma.donation.aggregate.mockResolvedValue({ _sum: { amount: null }, _count: 0 });
      prisma.donation.count.mockResolvedValue(0);
      prisma.donation.groupBy.mockResolvedValue([]);

      const summary = await repo.summary();

      expect(summary.totalReceived).toBe('0.00');
    });
  });

  describe('void filtering (§2.5) — every read path excludes voided rows by default', () => {
    it('findAllFiltered excludes voidedAt by default', async () => {
      await repo.findAllFiltered({});
      const where = prisma.donation.findMany.mock.calls[0][0].where;
      expect(where.voidedAt).toBeNull();
      expect(where.isDeleted).toBe(false);
    });

    it('findAllFiltered includes voided rows only when includeVoided is explicitly true', async () => {
      await repo.findAllFiltered({ includeVoided: true });
      const where = prisma.donation.findMany.mock.calls[0][0].where;
      expect(where.voidedAt).toBeUndefined();
    });

    it('findByIdWithRelations excludes voided rows by default', async () => {
      await repo.findByIdWithRelations('donation-1');
      const where = prisma.donation.findFirst.mock.calls[0][0].where;
      expect(where.voidedAt).toBeNull();
    });

    it('findByIdForVoidCheck bypasses the voided filter (so the service can 409, not 404)', async () => {
      await repo.findByIdForVoidCheck('donation-1');
      const where = prisma.donation.findFirst.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('voidedAt');
      expect(where.isDeleted).toBe(false);
    });

    it('findBySubscriberId excludes voided rows by default', async () => {
      await repo.findBySubscriberId('subscriber-1');
      const where = prisma.donation.findMany.mock.calls[0][0].where;
      expect(where.voidedAt).toBeNull();
      expect(where.donorId).toBe('subscriber-1');
    });
  });

  describe('ADR-0004 — relations to User are never a bare `include: true`', () => {
    it('findByIdWithRelations projects recordedBy/voidedBy with an explicit { id, fullName } select, never include: true', async () => {
      await repo.findByIdWithRelations('donation-1');
      const include = prisma.donation.findFirst.mock.calls[0][0].include;

      expect(include.recordedBy).toEqual({ select: { id: true, fullName: true } });
      expect(include.voidedBy).toEqual({ select: { id: true, fullName: true } });
      expect(include.recordedBy).not.toBe(true);
      expect(include.voidedBy).not.toBe(true);
    });

    it('findBySubscriberId (scoped list) omits donor but includes recordedBy/voidedBy actor projections', async () => {
      await repo.findBySubscriberId('subscriber-1');
      const include = prisma.donation.findMany.mock.calls[0][0].include;

      expect(include.donor).toBeUndefined();
      expect(include.recordedBy).toEqual({ select: { id: true, fullName: true } });
      expect(include.voidedBy).toEqual({ select: { id: true, fullName: true } });
    });

    it('findAllFiltered (unscoped list) embeds donor with an explicit select, never include: true', async () => {
      await repo.findAllFiltered({});
      const include = prisma.donation.findMany.mock.calls[0][0].include;

      expect(include.donor).toEqual({ select: { id: true, fullName: true, email: true } });
      expect(include.donor).not.toBe(true);
    });
  });

  describe('findPaidDonorIdsForPeriod (DARE2CARE-13 suppression predicate)', () => {
    it('queries with the exact §0 "counted as received" predicate', async () => {
      await repo.findPaidDonorIdsForPeriod('2026-08');

      const call = prisma.donation.groupBy.mock.calls[0][0];
      expect(call.by).toEqual(['donorId']);
      expect(call.where).toMatchObject({
        donorId: { not: null },
        periodMonth: '2026-08',
        status: 'COMPLETED',
        voidedAt: null,
        isDeleted: false,
      });
    });

    it('returns a Set built only from non-null donorIds', async () => {
      prisma.donation.groupBy.mockResolvedValueOnce([{ donorId: 'a' }, { donorId: 'b' }]);
      const result = await repo.findPaidDonorIdsForPeriod('2026-08');
      expect(result).toEqual(new Set(['a', 'b']));
    });
  });

  describe('sumReceivedByDonorForPeriod (DARE2CARE-12 reconciliation aggregation)', () => {
    it('aggregates via groupBy (SQL-side SUM), never loading donation rows to reduce in JS', async () => {
      prisma.donation.groupBy.mockResolvedValueOnce([
        {
          donorId: 'sub-1',
          _sum: { amount: new Prisma.Decimal('5000.00') },
          _max: { receivedAt: new Date('2026-08-03T00:00:00.000Z') },
        },
      ]);

      const result = await repo.sumReceivedByDonorForPeriod('2026-08');

      expect(result.get('sub-1')?.total.toFixed(2)).toBe('5000.00');
      expect(result.get('sub-1')?.lastReceivedAt).toEqual(new Date('2026-08-03T00:00:00.000Z'));

      const call = prisma.donation.groupBy.mock.calls[0][0];
      expect(call.where).toMatchObject({
        donorId: { not: null },
        periodMonth: '2026-08',
        status: 'COMPLETED',
        voidedAt: null,
        isDeleted: false,
      });
    });
  });
});
