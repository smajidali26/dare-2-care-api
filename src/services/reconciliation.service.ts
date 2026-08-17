import { Prisma } from '@prisma/client';
import { ReconciliationRepository } from '../repositories/reconciliation.repository';
import { currentUtcPeriod, isValidPeriod } from '../utils/period.util';
import { AppError } from '../utils/AppError';

export type ReconciliationStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

export interface ReconciliationRow {
  subscriberId: string;
  fullName: string;
  subscriberType: string;
  pledged: string;
  received: string;
  status: ReconciliationStatus;
  lastReceivedAt: Date | null;
}

export interface ReconciliationTotals {
  subscribers: number;
  pledged: string;
  received: string;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
}

export interface ReconciliationResult {
  period: string;
  currency: string;
  totals: ReconciliationTotals;
  rows: ReconciliationRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ReconciliationQuery {
  period?: string;
  status?: ReconciliationStatus;
  page?: number;
  limit?: number;
}

/**
 * Pledge-vs-received reconciliation (DARE2CARE-12).
 *
 * Considers active, non-deleted subscribers only, and — per §0 of the spec —
 * only donations that are donor-linked, period-matched, and count as
 * "received" (COMPLETED, not voided, not soft-deleted). Anonymous gifts and
 * `PENDING` donations never contribute here.
 */
export class ReconciliationService {
  constructor(private reconciliationRepository: ReconciliationRepository) {}

  async reconcile(query: ReconciliationQuery = {}): Promise<ReconciliationResult> {
    const period = query.period ?? currentUtcPeriod();
    if (!isValidPeriod(period)) {
      throw new AppError('period must be in YYYY-MM format', 400);
    }

    const [subscribers, receivedByDonor] = await Promise.all([
      this.reconciliationRepository.getActiveSubscribers(),
      this.reconciliationRepository.getReceivedTotalsForPeriod(period),
    ]);

    let pledgedTotal = new Prisma.Decimal(0);
    let receivedTotal = new Prisma.Decimal(0);
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;

    const allRows: ReconciliationRow[] = subscribers.map((subscriber) => {
      const pledged = subscriber.monthlyDonationAmount;
      const entry = receivedByDonor.get(subscriber.id);
      const received = entry?.total ?? new Prisma.Decimal(0);

      pledgedTotal = pledgedTotal.add(pledged);
      receivedTotal = receivedTotal.add(received);

      let status: ReconciliationStatus;
      if (received.gte(pledged)) {
        status = 'PAID';
        paidCount++;
      } else if (received.gt(0)) {
        status = 'PARTIAL';
        partialCount++;
      } else {
        status = 'UNPAID';
        unpaidCount++;
      }

      return {
        subscriberId: subscriber.id,
        fullName: subscriber.fullName,
        subscriberType: subscriber.subscriberType,
        pledged: pledged.toFixed(2),
        received: received.toFixed(2),
        status,
        lastReceivedAt: entry?.lastReceivedAt ?? null,
      };
    });

    const filteredRows = query.status ? allRows.filter((r) => r.status === query.status) : allRows;

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const total = filteredRows.length;
    const start = (page - 1) * limit;
    const rows = filteredRows.slice(start, start + limit);

    return {
      period,
      currency: 'PKR',
      totals: {
        subscribers: subscribers.length,
        pledged: pledgedTotal.toFixed(2),
        received: receivedTotal.toFixed(2),
        paidCount,
        partialCount,
        unpaidCount,
      },
      rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 },
    };
  }
}
