import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { DonationService } from '../donation.service';

/**
 * DonationService — DARE2CARE-9's seven defects, verified as fixed:
 *  1. money never touches a JS float
 *  2. refund() actually calls the gateway for Stripe donations
 *  3. the webhook cannot un-refund a REFUNDED donation
 *  4. status/currency are not client-settable
 *  5. void replaces delete
 *  6. (rate limiting — covered in rateLimit.middleware.test.ts)
 *  7. (env access — verified by inspection; stripe.gateway.ts already uses `env`)
 */
function buildFakeRepo() {
  return {
    findAllFiltered: vi.fn(),
    findByIdWithRelations: vi.fn(),
    findByIdForVoidCheck: vi.fn(),
    findBySubscriberId: vi.fn(),
    findByStripePaymentIntentId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    voidDonation: vi.fn(),
    findPaidDonorIdsForPeriod: vi.fn(),
    sumReceivedByDonorForPeriod: vi.fn(),
    summary: vi.fn(),
  };
}

function buildFakeGateway() {
  return {
    isConfigured: true,
    createPaymentIntent: vi.fn(),
    constructWebhookEvent: vi.fn(),
    refund: vi.fn(),
  };
}

describe('DonationService', () => {
  let repo: ReturnType<typeof buildFakeRepo>;
  let gateway: ReturnType<typeof buildFakeGateway>;
  let service: DonationService;

  beforeEach(() => {
    repo = buildFakeRepo();
    gateway = buildFakeGateway();
    service = new DonationService(repo as any, gateway as any);
  });

  describe('record() — §2.1 money never touches a JS float', () => {
    it('constructs a Decimal directly from the input string, preserving full precision', async () => {
      repo.create.mockResolvedValue({ id: 'd1' });

      await service.record({ amount: '12345678.91', donorName: 'Jane Doe' });

      const created = repo.create.mock.calls[0][0];
      expect(created.amount).toBeInstanceOf(Prisma.Decimal);
      expect((created.amount as Prisma.Decimal).toFixed(2)).toBe('12345678.91');
    });

    it('rejects a zero/negative amount', async () => {
      await expect(service.record({ amount: '0.00', donorName: 'Jane' })).rejects.toThrow(
        /positive/i
      );
    });

    it('requires a linked donor or a donor name', async () => {
      await expect(service.record({ amount: '100.00' } as any)).rejects.toThrow(/donor/i);
    });

    it('rejects a malformed periodMonth', async () => {
      await expect(
        service.record({ amount: '100.00', donorName: 'Jane', periodMonth: '2026-13' })
      ).rejects.toThrow(/periodMonth/i);
    });
  });

  describe('record() — §2.4 status/currency are service-owned, not client-settable', () => {
    it('always sets status COMPLETED and currency PKR regardless of extraneous input fields', async () => {
      repo.create.mockResolvedValue({ id: 'd1' });

      // Simulate a bypass of the TS type (e.g. a validator regression) to
      // prove the service itself never reads these fields off the input.
      await service.record({
        amount: '500.00',
        donorName: 'Jane',
        status: 'REFUNDED',
        currency: 'USD',
      } as any);

      const created = repo.create.mock.calls[0][0];
      expect(created.status).toBe('COMPLETED');
      expect(created.currency).toBe('PKR');
    });
  });

  describe('refund() — §2.2 a Stripe refund must actually call the gateway', () => {
    it('calls gateway.refund for a Stripe donation and only then sets REFUNDED', async () => {
      repo.findByIdWithRelations.mockResolvedValue({
        id: 'd1',
        status: 'COMPLETED',
        method: 'STRIPE',
        stripePaymentIntentId: 'pi_123',
      });
      gateway.refund.mockResolvedValue({ refundId: 're_123' });
      repo.update.mockResolvedValue({ id: 'd1', status: 'REFUNDED' });

      const result = await service.refund('d1', {});

      expect(gateway.refund).toHaveBeenCalledWith({ paymentIntentId: 'pi_123' });
      expect(repo.update).toHaveBeenCalledWith('d1', { status: 'REFUNDED' });
      expect(result.status).toBe('REFUNDED');
    });

    it('leaves status unchanged when the gateway refund fails', async () => {
      repo.findByIdWithRelations.mockResolvedValue({
        id: 'd1',
        status: 'COMPLETED',
        method: 'STRIPE',
        stripePaymentIntentId: 'pi_123',
      });
      gateway.refund.mockRejectedValue(new Error('card issuer declined the refund'));

      await expect(service.refund('d1', {})).rejects.toThrow(/declined/);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('rejects manual=true for a Stripe donation (never silently record-only)', async () => {
      repo.findByIdWithRelations.mockResolvedValue({
        id: 'd1',
        status: 'COMPLETED',
        method: 'STRIPE',
        stripePaymentIntentId: 'pi_123',
      });

      await expect(service.refund('d1', { manual: true })).rejects.toThrow(/gateway/i);
      expect(gateway.refund).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('does not call the gateway for a manual (non-Stripe) refund', async () => {
      repo.findByIdWithRelations.mockResolvedValue({
        id: 'd1',
        status: 'COMPLETED',
        method: 'CASH',
      });
      repo.update.mockResolvedValue({ id: 'd1', status: 'REFUNDED' });

      const result = await service.refund('d1', { manual: true });

      expect(gateway.refund).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith('d1', { status: 'REFUNDED' });
      expect(result.status).toBe('REFUNDED');
    });

    it('requires manual=true to refund a non-Stripe donation', async () => {
      repo.findByIdWithRelations.mockResolvedValue({ id: 'd1', status: 'COMPLETED', method: 'CASH' });

      await expect(service.refund('d1', {})).rejects.toThrow(/manual/i);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('rejects refunding an already-refunded donation', async () => {
      repo.findByIdWithRelations.mockResolvedValue({
        id: 'd1',
        status: 'REFUNDED',
        method: 'CASH',
      });

      await expect(service.refund('d1', { manual: true })).rejects.toThrow(/already refunded/i);
    });

    it('rejects refunding a PENDING donation (only COMPLETED -> REFUNDED is allowed)', async () => {
      repo.findByIdWithRelations.mockResolvedValue({
        id: 'd1',
        status: 'PENDING',
        method: 'STRIPE',
        stripePaymentIntentId: 'pi_123',
      });

      await expect(service.refund('d1', {})).rejects.toThrow(/cannot transition/i);
    });
  });

  describe('handleStripeWebhook() — §2.3 cannot un-refund a REFUNDED donation', () => {
    it('ignores a replayed succeeded event on an already-REFUNDED donation', async () => {
      gateway.constructWebhookEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        paymentIntentId: 'pi_123',
        chargeId: 'ch_123',
      });
      repo.findByStripePaymentIntentId.mockResolvedValue({
        id: 'd1',
        status: 'REFUNDED',
      });

      await service.handleStripeWebhook(Buffer.from(''), 'sig');

      expect(repo.update).not.toHaveBeenCalled();
    });

    it('allows PENDING -> COMPLETED on a genuine succeeded event', async () => {
      gateway.constructWebhookEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        paymentIntentId: 'pi_123',
        chargeId: 'ch_123',
      });
      repo.findByStripePaymentIntentId.mockResolvedValue({ id: 'd1', status: 'PENDING' });
      repo.update.mockResolvedValue({ id: 'd1', status: 'COMPLETED' });

      await service.handleStripeWebhook(Buffer.from(''), 'sig');

      expect(repo.update).toHaveBeenCalledWith(
        'd1',
        expect.objectContaining({ status: 'COMPLETED', stripeChargeId: 'ch_123' })
      );
    });

    it('ignores a failed event on a non-PENDING donation', async () => {
      gateway.constructWebhookEvent.mockReturnValue({
        type: 'payment_intent.payment_failed',
        paymentIntentId: 'pi_123',
      });
      repo.findByStripePaymentIntentId.mockResolvedValue({ id: 'd1', status: 'COMPLETED' });

      await service.handleStripeWebhook(Buffer.from(''), 'sig');

      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('createDonationIntent() — §2.1 Stripe minor units computed from Decimal, not float math', () => {
    it('computes amountMinor exactly for a value that drifts under float multiplication', async () => {
      gateway.createPaymentIntent.mockResolvedValue({
        clientSecret: 'secret',
        paymentIntentId: 'pi_1',
      });
      repo.create.mockResolvedValue({ id: 'd1' });

      // 0.1 + 0.2 style float traps: 165.07 * 100 in naive float math can drift.
      await service.createDonationIntent({ amount: '165.07' });

      expect(gateway.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({ amountMinor: 16507 })
      );
    });
  });

  describe('voidDonation() — §2.5 the only correction path for money', () => {
    it('sets voidedAt/voidedByUserId/voidReason without touching amount/status/receivedAt/periodMonth', async () => {
      repo.findByIdForVoidCheck.mockResolvedValue({ id: 'd1', voidedAt: null });
      repo.voidDonation.mockResolvedValue({ id: 'd1', voidedAt: new Date() });

      await service.voidDonation('d1', { voidReason: 'Mis-keyed amount', voidedByUserId: 'user-1' });

      const call = repo.voidDonation.mock.calls[0][1];
      expect(call).toEqual(
        expect.objectContaining({ voidedByUserId: 'user-1', voidReason: 'Mis-keyed amount' })
      );
      expect(call.voidedAt).toBeInstanceOf(Date);
      expect(call).not.toHaveProperty('amount');
      expect(call).not.toHaveProperty('status');
      expect(call).not.toHaveProperty('receivedAt');
      expect(call).not.toHaveProperty('periodMonth');
    });

    it('returns 404 for a donation that does not exist', async () => {
      repo.findByIdForVoidCheck.mockResolvedValue(null);

      await expect(service.voidDonation('missing', { voidReason: 'x-y-z' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('returns 409 when voiding an already-voided donation', async () => {
      repo.findByIdForVoidCheck.mockResolvedValue({ id: 'd1', voidedAt: new Date() });

      await expect(service.voidDonation('d1', { voidReason: 'again' })).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(repo.voidDonation).not.toHaveBeenCalled();
    });

    it('never mutates voidedByUserId from anything other than what the caller (the authenticated user) provides', async () => {
      repo.findByIdForVoidCheck.mockResolvedValue({ id: 'd1', voidedAt: null });
      repo.voidDonation.mockResolvedValue({ id: 'd1' });

      await service.voidDonation('d1', { voidReason: 'test reason' } as any);

      const call = repo.voidDonation.mock.calls[0][1];
      expect(call.voidedByUserId).toBeNull();
    });
  });
});
