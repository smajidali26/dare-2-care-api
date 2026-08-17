import { describe, it, expect } from 'vitest';
import {
  createDonationSchema,
  donationIntentSchema,
  voidDonationSchema,
  refundDonationSchema,
  subscriberDonationsSchema,
} from '../donation.validator';

describe('createDonationSchema — §2.1 amount as string, §2.4 status/currency not accepted', () => {
  const base = { donorName: 'Jane Doe' };

  it('accepts a valid string amount', () => {
    const result = createDonationSchema.safeParse({ body: { ...base, amount: '1500.00' } });
    expect(result.success).toBe(true);
  });

  it('rejects a JS number for amount (must be a string, never coerced)', () => {
    const result = createDonationSchema.safeParse({ body: { ...base, amount: 1500 as any } });
    expect(result.success).toBe(false);
  });

  it('rejects "0.00" (non-positive)', () => {
    const result = createDonationSchema.safeParse({ body: { ...base, amount: '0.00' } });
    expect(result.success).toBe(false);
  });

  it('rejects a negative amount', () => {
    const result = createDonationSchema.safeParse({ body: { ...base, amount: '-5.00' } });
    expect(result.success).toBe(false);
  });

  it('rejects more than 2 decimal places', () => {
    const result = createDonationSchema.safeParse({ body: { ...base, amount: '100.999' } });
    expect(result.success).toBe(false);
  });

  it('accepts up to 10 integer digits (Decimal(12,2) precision)', () => {
    const result = createDonationSchema.safeParse({ body: { ...base, amount: '1234567890.12' } });
    expect(result.success).toBe(true);
  });

  it('strips status and currency from the parsed output even if supplied', () => {
    const result = createDonationSchema.safeParse({
      body: { ...base, amount: '100.00', status: 'REFUNDED', currency: 'USD' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).not.toHaveProperty('status');
      expect(result.data.body).not.toHaveProperty('currency');
    }
  });

  it('accepts a valid periodMonth', () => {
    const result = createDonationSchema.safeParse({
      body: { ...base, amount: '100.00', periodMonth: '2026-08' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed periodMonth', () => {
    const result = createDonationSchema.safeParse({
      body: { ...base, amount: '100.00', periodMonth: '2026-13' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects when neither donorId nor donorName is provided', () => {
    const result = createDonationSchema.safeParse({ body: { amount: '100.00' } });
    expect(result.success).toBe(false);
  });
});

describe('donationIntentSchema — amount as string', () => {
  it('rejects a JS number amount', () => {
    const result = donationIntentSchema.safeParse({ body: { amount: 100 as any } });
    expect(result.success).toBe(false);
  });

  it('accepts a valid string amount', () => {
    const result = donationIntentSchema.safeParse({ body: { amount: '250.50' } });
    expect(result.success).toBe(true);
  });
});

describe('voidDonationSchema', () => {
  it('requires a voidReason of at least 3 characters', () => {
    const tooShort = voidDonationSchema.safeParse({
      params: { id: '11111111-1111-1111-1111-111111111111' },
      body: { voidReason: 'ab' },
    });
    expect(tooShort.success).toBe(false);

    const ok = voidDonationSchema.safeParse({
      params: { id: '11111111-1111-1111-1111-111111111111' },
      body: { voidReason: 'Mis-keyed amount' },
    });
    expect(ok.success).toBe(true);
  });
});

describe('refundDonationSchema', () => {
  it('defaults manual to absent/undefined when no body is sent', () => {
    const result = refundDonationSchema.safeParse({
      params: { id: '11111111-1111-1111-1111-111111111111' },
      body: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('accepts an explicit manual flag', () => {
    const result = refundDonationSchema.safeParse({
      params: { id: '11111111-1111-1111-1111-111111111111' },
      body: { manual: true },
    });
    expect(result.success).toBe(true);
  });
});

describe('subscriberDonationsSchema', () => {
  it('accepts includeVoided, page, limit as optional query params', () => {
    const result = subscriberDonationsSchema.safeParse({
      params: { id: '11111111-1111-1111-1111-111111111111' },
      query: { includeVoided: 'true', page: '2', limit: '10' },
    });
    expect(result.success).toBe(true);
  });
});
