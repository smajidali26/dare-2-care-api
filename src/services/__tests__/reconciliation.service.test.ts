import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { ReconciliationService } from '../reconciliation.service';

/**
 * DARE2CARE-12 — pledge-vs-received reconciliation.
 *
 * The SQL-side predicate that keeps voided / PENDING / wrong-period /
 * anonymous donations out of `receivedByDonor` is exercised directly against
 * the Prisma query shape in `donation.repository.test.ts`
 * (`sumReceivedByDonorForPeriod`) and `reconciliation.repository.test.ts`
 * (`getActiveSubscribers`, `getReceivedTotalsForPeriod`). This file exercises
 * the service's business logic — status derivation, totals, decimal
 * precision, default period, and status-filter/pagination — by handing it
 * pre-aggregated results (as the repository layer would produce them).
 */
function buildFakeRepo() {
  return {
    getActiveSubscribers: vi.fn(),
    getReceivedTotalsForPeriod: vi.fn(),
  };
}

describe('ReconciliationService.reconcile', () => {
  let repo: ReturnType<typeof buildFakeRepo>;
  let service: ReconciliationService;

  beforeEach(() => {
    repo = buildFakeRepo();
    service = new ReconciliationService(repo as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const subscriber = (id: string, fullName: string, pledged: string) => ({
    id,
    fullName,
    subscriberType: 'GENERAL',
    monthlyDonationAmount: new Prisma.Decimal(pledged),
  });

  it('classifies PAID / PARTIAL / UNPAID / overpaid(->PAID) correctly', async () => {
    repo.getActiveSubscribers.mockResolvedValue([
      subscriber('paid', 'Paid In Full', '5000.00'),
      subscriber('over', 'Overpaid', '5000.00'),
      subscriber('partial', 'Partial', '5000.00'),
      subscriber('unpaid', 'Unpaid', '5000.00'),
    ]);
    repo.getReceivedTotalsForPeriod.mockResolvedValue(
      new Map([
        ['paid', { total: new Prisma.Decimal('5000.00'), lastReceivedAt: new Date('2026-08-01') }],
        ['over', { total: new Prisma.Decimal('6000.00'), lastReceivedAt: new Date('2026-08-02') }],
        ['partial', { total: new Prisma.Decimal('2000.00'), lastReceivedAt: new Date('2026-08-03') }],
        // 'unpaid' has no entry at all.
      ])
    );

    const result = await service.reconcile({ period: '2026-08' });
    const byId = Object.fromEntries(result.rows.map((r) => [r.subscriberId, r]));

    expect(byId.paid.status).toBe('PAID');
    expect(byId.over.status).toBe('PAID');
    expect(byId.over.received).toBe('6000.00');
    expect(byId.partial.status).toBe('PARTIAL');
    expect(byId.unpaid.status).toBe('UNPAID');
    expect(byId.unpaid.received).toBe('0.00');

    expect(result.totals.paidCount).toBe(2);
    expect(result.totals.partialCount).toBe(1);
    expect(result.totals.unpaidCount).toBe(1);
    expect(result.totals.subscribers).toBe(4);
  });

  it('preserves exact decimal precision in totals (no float drift)', async () => {
    repo.getActiveSubscribers.mockResolvedValue([
      subscriber('a', 'A', '333.33'),
      subscriber('b', 'B', '333.33'),
      subscriber('c', 'C', '333.34'),
    ]);
    repo.getReceivedTotalsForPeriod.mockResolvedValue(new Map());

    const result = await service.reconcile({ period: '2026-08' });

    expect(result.totals.pledged).toBe('1000.00');
  });

  it('defaults to the current UTC period when none is supplied', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-17T23:59:00.000Z'));

    repo.getActiveSubscribers.mockResolvedValue([]);
    repo.getReceivedTotalsForPeriod.mockResolvedValue(new Map());

    const result = await service.reconcile();

    expect(result.period).toBe('2026-08');
    expect(repo.getReceivedTotalsForPeriod).toHaveBeenCalledWith('2026-08');
  });

  it('rejects a malformed period', async () => {
    await expect(service.reconcile({ period: 'not-a-period' })).rejects.toThrow(/YYYY-MM/);
  });

  it('filters rows by status without changing the totals (totals reflect all active subscribers)', async () => {
    repo.getActiveSubscribers.mockResolvedValue([
      subscriber('paid', 'Paid', '100.00'),
      subscriber('unpaid', 'Unpaid', '100.00'),
    ]);
    repo.getReceivedTotalsForPeriod.mockResolvedValue(
      new Map([['paid', { total: new Prisma.Decimal('100.00'), lastReceivedAt: new Date() }]])
    );

    const result = await service.reconcile({ period: '2026-08', status: 'UNPAID' });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].subscriberId).toBe('unpaid');
    expect(result.totals.paidCount).toBe(1);
    expect(result.totals.unpaidCount).toBe(1);
  });

  it('paginates rows', async () => {
    repo.getActiveSubscribers.mockResolvedValue([
      subscriber('a', 'A', '100.00'),
      subscriber('b', 'B', '100.00'),
      subscriber('c', 'C', '100.00'),
    ]);
    repo.getReceivedTotalsForPeriod.mockResolvedValue(new Map());

    const result = await service.reconcile({ period: '2026-08', page: 2, limit: 2 });

    expect(result.rows).toHaveLength(1);
    expect(result.meta).toEqual({ total: 3, page: 2, limit: 2, totalPages: 2 });
  });
});
