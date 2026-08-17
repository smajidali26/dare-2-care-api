import { describe, it, expect } from 'vitest';
import { createSubscriberSchema, updateSubscriberSchema } from '../subscriber.validator';

/**
 * DARE2CARE-23 / ADR-0007 — createSubscriberSchema/updateSubscriberSchema
 * must sanitise `managementBio` via the write-boundary sanitiser, and — since
 * the column is nullable — must pass `null`/absent straight through without
 * throwing or coercing it to `''`.
 */
const validBase = {
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phoneNumber: '+1234567890',
  monthlyDonationAmount: 50,
  subscriberType: 'GENERAL' as const,
  paymentType: 'DONATION' as const,
};

describe('createSubscriberSchema — managementBio', () => {
  it('strips a <script> tag from managementBio', () => {
    const result = createSubscriberSchema.safeParse({
      body: { ...validBase, managementBio: '<p>Chair of the board</p><script>alert(1)</script>' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.managementBio).not.toContain('<script');
      expect(result.data.body.managementBio).toContain('<p>Chair of the board</p>');
    }
  });

  it('passes managementBio: null through untouched (not thrown, not coerced to "")', () => {
    const result = createSubscriberSchema.safeParse({
      body: { ...validBase, managementBio: null },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.managementBio).toBeNull();
    }
  });

  it('leaves managementBio undefined when omitted entirely', () => {
    const result = createSubscriberSchema.safeParse({ body: { ...validBase } });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.managementBio).toBeUndefined();
    }
  });

  it('adds rel="noopener noreferrer" to an allowed link in managementBio', () => {
    const result = createSubscriberSchema.safeParse({
      body: { ...validBase, managementBio: '<a href="https://example.com">bio link</a>' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.managementBio).toContain('rel="noopener noreferrer"');
    }
  });
});

describe('updateSubscriberSchema — managementBio', () => {
  const params = { id: '11111111-1111-1111-1111-111111111111' };

  it('strips a <script> tag from managementBio on update', () => {
    const result = updateSubscriberSchema.safeParse({
      params,
      body: { managementBio: '<p>Updated bio</p><script>alert(1)</script>' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.managementBio).not.toContain('<script');
      expect(result.data.body.managementBio).toContain('<p>Updated bio</p>');
    }
  });

  it('passes managementBio: null through untouched on update (explicit clear)', () => {
    const result = updateSubscriberSchema.safeParse({
      params,
      body: { managementBio: null },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.managementBio).toBeNull();
    }
  });

  it('leaves managementBio undefined when omitted (Prisma: leave unchanged)', () => {
    const result = updateSubscriberSchema.safeParse({
      params,
      body: { fullName: 'Jane Updated' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.managementBio).toBeUndefined();
    }
  });
});
