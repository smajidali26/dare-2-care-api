import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * StripeGateway.refund — DARE2CARE-9 §2.2. Before this ticket, `refund()`
 * only flipped local status and never contacted Stripe; this test proves the
 * gateway method exists, calls the real Stripe refunds API by payment-intent
 * id, and degrades gracefully (never crashes) when unconfigured.
 */
const mockRefundsCreate = vi.fn();
const mockPaymentIntentsCreate = vi.fn();
const mockConstructEvent = vi.fn();

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      refunds: { create: mockRefundsCreate },
      paymentIntents: { create: mockPaymentIntentsCreate },
      webhooks: { constructEvent: mockConstructEvent },
    })),
  };
});

const mockEnv = vi.hoisted<{ STRIPE_SECRET_KEY?: string; STRIPE_WEBHOOK_SECRET?: string }>(() => ({}));
vi.mock('../../../config/env.config', () => ({ env: mockEnv }));

import { StripeGateway } from '../stripe.gateway';

describe('StripeGateway.refund', () => {
  beforeEach(() => {
    mockRefundsCreate.mockReset();
    mockEnv.STRIPE_SECRET_KEY = 'sk_test_123';
    mockEnv.STRIPE_WEBHOOK_SECRET = 'whsec_123';
  });

  it('calls stripe.refunds.create with the payment intent id and returns the refund id', async () => {
    mockRefundsCreate.mockResolvedValue({ id: 're_abc123' });
    const gateway = new StripeGateway();

    const result = await gateway.refund({ paymentIntentId: 'pi_abc123' });

    expect(mockRefundsCreate).toHaveBeenCalledWith({ payment_intent: 'pi_abc123' });
    expect(result).toEqual({ refundId: 're_abc123' });
  });

  it('surfaces a gateway failure as an AppError rather than silently succeeding', async () => {
    mockRefundsCreate.mockRejectedValue(new Error('charge already refunded'));
    const gateway = new StripeGateway();

    await expect(gateway.refund({ paymentIntentId: 'pi_abc123' })).rejects.toThrow(/refund failed/i);
  });

  it('throws 503 when Stripe is not configured, rather than crashing', async () => {
    delete mockEnv.STRIPE_SECRET_KEY;
    const gateway = new StripeGateway();

    await expect(gateway.refund({ paymentIntentId: 'pi_abc123' })).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(mockRefundsCreate).not.toHaveBeenCalled();
  });
});
