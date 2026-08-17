import { PrismaClient, Prisma } from '@prisma/client';
import { DonationRepository } from './donation.repository';

export interface ActiveSubscriberForReconciliation {
  id: string;
  fullName: string;
  subscriberType: string;
  monthlyDonationAmount: Prisma.Decimal;
}

/**
 * Reconciliation Repository (DARE2CARE-12)
 *
 * Spans two models (Subscriber, Donation) because pledge-vs-received
 * reconciliation is inherently a join between "who is pledged to pay" and
 * "what did we actually receive this period" — it is not naturally owned by
 * either model's own repository. The SUM aggregation itself still happens in
 * SQL via `DonationRepository.sumReceivedByDonorForPeriod` (a Prisma
 * `groupBy`); this repository only adds the (small, dimension-sized)
 * active-subscriber list to combine against, in the same spirit as
 * `NotificationService.broadcast()`'s existing full-subscriber-list read.
 */
export class ReconciliationRepository {
  private donationRepository: DonationRepository;

  constructor(private prisma: PrismaClient) {
    this.donationRepository = new DonationRepository(prisma);
  }

  async getActiveSubscribers(): Promise<ActiveSubscriberForReconciliation[]> {
    return this.prisma.subscriber.findMany({
      where: { isActive: true, isDeleted: false },
      select: { id: true, fullName: true, subscriberType: true, monthlyDonationAmount: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async getReceivedTotalsForPeriod(
    period: string
  ): Promise<Map<string, { total: Prisma.Decimal; lastReceivedAt: Date | null }>> {
    return this.donationRepository.sumReceivedByDonorForPeriod(period);
  }
}
