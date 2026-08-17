import { Donation, PaymentStatus, Prisma } from '@prisma/client';
import { DonationRepository, DonationFilters, DonationSummary } from '../repositories/donation.repository';
import { AppError } from '../utils/AppError';
import { PaymentGateway } from './payment/gateway';
import { StripeGateway } from './payment/stripe.gateway';
import { isValidPeriod } from '../utils/period.util';

/**
 * Donation Service
 * Business logic for recording and managing donations.
 *
 * Ledger semantics: donations are append-only. A recorded amount is never
 * edited — corrections happen through refund/void, not by editing the row.
 */
export interface RecordDonationInput {
  /** Accepted as a validated STRING — never a JS number (DARE2CARE-9 §2.1). */
  amount: string;
  paymentType?: 'DONATION' | 'ZAKAT' | 'MEMBER_FEE' | 'CHARITY';
  method?: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'WALLET' | 'CHEQUE' | 'STRIPE';
  donorId?: string | null;
  donorName?: string | null;
  donorEmail?: string | null;
  note?: string | null;
  periodMonth?: string | null;
  reference?: string | null;
  receivedAt?: Date;
  stripePaymentIntentId?: string | null;
  recordedByUserId?: string | null;
  // `status` and `currency` are deliberately absent — the service owns both (§2.4).
}

export interface RefundInput {
  /**
   * Must be explicitly true to record a manual (non-gateway) refund for a
   * non-Stripe donation. Its absence on a Stripe donation means "attempt a
   * gateway refund", never "just flip the status" (§2.2).
   */
  manual?: boolean;
}

export interface VoidInput {
  voidReason: string;
  voidedByUserId?: string | null;
}

/**
 * Centralised status transition table (§2.3). Only these transitions are
 * permitted; every write path that changes `status` goes through
 * `assertTransition` / `canTransition` rather than checking ad hoc.
 */
const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ['COMPLETED', 'FAILED'],
  COMPLETED: ['REFUNDED'],
  REFUNDED: [],
  FAILED: [],
};

export class DonationService {
  constructor(
    private donationRepository: DonationRepository,
    private gateway: PaymentGateway = new StripeGateway()
  ) {}

  private canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
  }

  private assertTransition(from: PaymentStatus, to: PaymentStatus): void {
    if (from === to && to === 'REFUNDED') {
      throw new AppError('Donation is already refunded', 400);
    }
    if (!this.canTransition(from, to)) {
      throw new AppError(`Cannot transition donation from ${from} to ${to}`, 400);
    }
  }

  async list(filters: DonationFilters) {
    return this.donationRepository.findAllFiltered(filters);
  }

  async getById(id: string, includeVoided = false): Promise<Donation> {
    const donation = await this.donationRepository.findByIdWithRelations(id, includeVoided);
    if (!donation) {
      throw new AppError('Donation not found', 404);
    }
    return donation;
  }

  async listBySubscriber(
    subscriberId: string,
    options: { includeVoided?: boolean; page?: number; limit?: number } = {}
  ) {
    return this.donationRepository.findBySubscriberId(subscriberId, options);
  }

  /**
   * Record a manual donation. Manual entries are always COMPLETED — money is
   * already in hand by the time staff key it in; only gateway-initiated
   * donations pass through PENDING (see createDonationIntent). Currency is
   * always the schema default; neither is client-settable (§2.4).
   */
  async record(input: RecordDonationInput): Promise<Donation> {
    const amount = new Prisma.Decimal(input.amount);
    if (amount.lte(0)) {
      throw new AppError('Amount must be a positive number', 400);
    }
    if (!input.donorId && !input.donorName) {
      throw new AppError('A linked donor or a donor name is required', 400);
    }
    if (input.periodMonth && !isValidPeriod(input.periodMonth)) {
      throw new AppError('periodMonth must be in YYYY-MM format', 400);
    }

    const data: Prisma.DonationCreateInput = {
      amount,
      currency: 'PKR',
      paymentType: input.paymentType || 'DONATION',
      method: input.method || 'CASH',
      status: 'COMPLETED',
      donorName: input.donorName ?? undefined,
      donorEmail: input.donorEmail ?? undefined,
      note: input.note ?? undefined,
      periodMonth: input.periodMonth ?? undefined,
      reference: input.reference ?? undefined,
      receivedAt: input.receivedAt || new Date(),
      stripePaymentIntentId: input.stripePaymentIntentId ?? undefined,
    };

    if (input.donorId) {
      data.donor = { connect: { id: input.donorId } };
    }
    if (input.recordedByUserId) {
      data.recordedBy = { connect: { id: input.recordedByUserId } };
    }

    return this.donationRepository.create(data);
  }

  /**
   * Refund a donation (§2.2). A Stripe donation MUST attempt the gateway
   * refund — recording-only would let the ledger diverge from what Stripe
   * actually holds. A non-Stripe donation requires `manual: true` so a
   * bookkeeping-only refund is never mistaken for one that actually moved
   * money back through the gateway.
   */
  async refund(id: string, input: RefundInput = {}): Promise<Donation> {
    const donation = await this.getById(id);
    this.assertTransition(donation.status, 'REFUNDED');

    if (donation.method === 'STRIPE') {
      if (input.manual) {
        throw new AppError(
          'Stripe donations cannot be refunded manually; the gateway must be used',
          400
        );
      }
      if (!donation.stripePaymentIntentId) {
        throw new AppError('Donation has no Stripe payment intent to refund', 400);
      }

      // Gateway failure surfaces to the caller and leaves status unchanged —
      // we only flip to REFUNDED after the gateway confirms.
      await this.gateway.refund({ paymentIntentId: donation.stripePaymentIntentId });
      return this.donationRepository.update(id, { status: 'REFUNDED' });
    }

    if (!input.manual) {
      throw new AppError(
        'Set { "manual": true } to record a manual refund for a non-Stripe donation',
        400
      );
    }
    return this.donationRepository.update(id, { status: 'REFUNDED' });
  }

  /**
   * Void a donation (§2.5) — the only correction path for money. Never
   * mutates amount / receivedAt / periodMonth / status.
   */
  async voidDonation(id: string, input: VoidInput): Promise<Donation> {
    const donation = await this.donationRepository.findByIdForVoidCheck(id);
    if (!donation) {
      throw new AppError('Donation not found', 404);
    }
    if (donation.voidedAt) {
      throw new AppError('Donation is already voided', 409);
    }

    return this.donationRepository.voidDonation(id, {
      voidedAt: new Date(),
      voidedByUserId: input.voidedByUserId ?? null,
      voidReason: input.voidReason,
    });
  }

  async summary(): Promise<DonationSummary> {
    return this.donationRepository.summary();
  }

  /**
   * Create a gateway PaymentIntent and a PENDING donation linked to it.
   * The donation is flipped to COMPLETED by the webhook on success.
   */
  async createDonationIntent(input: {
    amount: string;
    paymentType?: 'DONATION' | 'ZAKAT' | 'MEMBER_FEE' | 'CHARITY';
    donorName?: string | null;
    donorEmail?: string | null;
    note?: string | null;
  }): Promise<{ clientSecret: string; donationId: string }> {
    const amount = new Prisma.Decimal(input.amount);
    if (amount.lte(0)) {
      throw new AppError('Amount must be a positive number', 400);
    }

    // Minor units computed from the Decimal, never `Math.round(amount * 100)`
    // (float multiplication — §2.1). `.mul(100).toFixed(0)` is exact.
    const amountMinor = Number(amount.mul(100).toFixed(0));

    const { clientSecret, paymentIntentId } = await this.gateway.createPaymentIntent({
      amountMinor,
      currency: 'pkr',
      description: 'Dare2Care donation',
      metadata: { paymentType: input.paymentType || 'DONATION' },
    });

    const donation = await this.donationRepository.create({
      amount,
      currency: 'PKR',
      paymentType: input.paymentType || 'DONATION',
      method: 'STRIPE',
      status: 'PENDING',
      donorName: input.donorName ?? undefined,
      donorEmail: input.donorEmail ?? undefined,
      note: input.note ?? undefined,
      stripePaymentIntentId: paymentIntentId,
    });

    return { clientSecret, donationId: donation.id };
  }

  /**
   * Process a verified gateway webhook. Idempotent by payment-intent id, and
   * guarded by the same transition table as every other status change
   * (§2.3) — a replayed `succeeded` event can never move a REFUNDED donation
   * back to COMPLETED, because REFUNDED -> COMPLETED is not an allowed
   * transition. Disallowed transitions are logged and ignored, not thrown,
   * so Stripe does not retry a webhook we've deliberately no-op'd.
   */
  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
    const event = this.gateway.constructWebhookEvent(rawBody, signature);

    if (event.paymentIntentId) {
      const donation = await this.donationRepository.findByStripePaymentIntentId(event.paymentIntentId);
      if (donation) {
        if (event.type === 'payment_intent.succeeded') {
          if (this.canTransition(donation.status, 'COMPLETED')) {
            await this.donationRepository.update(donation.id, {
              status: 'COMPLETED',
              stripeChargeId: event.chargeId,
              receivedAt: new Date(),
            });
          } else {
            console.warn(
              `[DonationService] Ignored ${event.type} for donation ${donation.id}: ` +
                `disallowed transition ${donation.status} -> COMPLETED`
            );
          }
        } else if (event.type === 'payment_intent.payment_failed') {
          if (this.canTransition(donation.status, 'FAILED')) {
            await this.donationRepository.update(donation.id, { status: 'FAILED' });
          } else {
            console.warn(
              `[DonationService] Ignored ${event.type} for donation ${donation.id}: ` +
                `disallowed transition ${donation.status} -> FAILED`
            );
          }
        }
      }
    }

    return { received: true };
  }
}
