import { Donation, Prisma } from '@prisma/client';
import { DonationRepository, DonationFilters, DonationSummary } from '../repositories/donation.repository';
import { AppError } from '../utils/AppError';

/**
 * Donation Service
 * Business logic for recording and managing donations.
 *
 * Ledger semantics: donations are append-only. A recorded amount is never
 * edited — corrections happen through refund/adjustment status transitions.
 */
export interface RecordDonationInput {
  amount: number | string;
  currency?: string;
  paymentType?: 'DONATION' | 'ZAKAT' | 'MEMBER_FEE' | 'CHARITY';
  method?: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'WALLET' | 'CHEQUE' | 'STRIPE';
  status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  donorId?: string | null;
  donorName?: string | null;
  donorEmail?: string | null;
  note?: string | null;
  receivedAt?: Date;
  stripePaymentIntentId?: string | null;
  recordedByUserId?: string | null;
}

export class DonationService {
  constructor(private donationRepository: DonationRepository) {}

  async list(filters: DonationFilters) {
    return this.donationRepository.findAllFiltered(filters);
  }

  async getById(id: string): Promise<Donation> {
    const donation = await this.donationRepository.findByIdWithDonor(id);
    if (!donation) {
      throw new AppError('Donation not found', 404);
    }
    return donation;
  }

  /**
   * Record a donation. Manual entries default to COMPLETED (money in hand);
   * gateway-initiated donations pass status PENDING explicitly.
   */
  async record(input: RecordDonationInput): Promise<Donation> {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError('Amount must be a positive number', 400);
    }
    if (!input.donorId && !input.donorName) {
      throw new AppError('A linked donor or a donor name is required', 400);
    }

    const data: Prisma.DonationCreateInput = {
      amount: new Prisma.Decimal(amount),
      currency: input.currency || 'PKR',
      paymentType: input.paymentType || 'DONATION',
      method: input.method || 'CASH',
      status: input.status || 'COMPLETED',
      donorName: input.donorName ?? undefined,
      donorEmail: input.donorEmail ?? undefined,
      note: input.note ?? undefined,
      receivedAt: input.receivedAt || new Date(),
      stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
      recordedByUserId: input.recordedByUserId ?? undefined,
    };

    if (input.donorId) {
      data.donor = { connect: { id: input.donorId } };
    }

    return this.donationRepository.create(data);
  }

  /**
   * Mark a donation as refunded (status transition, not a delete).
   */
  async refund(id: string): Promise<Donation> {
    const donation = await this.getById(id);
    if (donation.status === 'REFUNDED') {
      throw new AppError('Donation is already refunded', 400);
    }
    return this.donationRepository.update(id, { status: 'REFUNDED' });
  }

  async remove(id: string): Promise<void> {
    await this.getById(id);
    await this.donationRepository.softDelete(id);
  }

  async summary(): Promise<DonationSummary> {
    return this.donationRepository.summary();
  }
}
