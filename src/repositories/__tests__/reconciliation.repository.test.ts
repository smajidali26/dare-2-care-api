import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReconciliationRepository } from '../reconciliation.repository';

describe('ReconciliationRepository', () => {
  let prisma: any;
  let repo: ReconciliationRepository;

  beforeEach(() => {
    prisma = {
      subscriber: { findMany: vi.fn().mockResolvedValue([]) },
      donation: { groupBy: vi.fn().mockResolvedValue([]) },
    };
    repo = new ReconciliationRepository(prisma);
  });

  it('getActiveSubscribers considers only active, non-deleted subscribers', async () => {
    await repo.getActiveSubscribers();

    const call = prisma.subscriber.findMany.mock.calls[0][0];
    expect(call.where).toEqual({ isActive: true, isDeleted: false });
    expect(call.select).toMatchObject({
      id: true,
      fullName: true,
      subscriberType: true,
      monthlyDonationAmount: true,
    });
  });

  it('getReceivedTotalsForPeriod delegates to the same SQL-side aggregation used by suppression', async () => {
    await repo.getReceivedTotalsForPeriod('2026-08');

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
