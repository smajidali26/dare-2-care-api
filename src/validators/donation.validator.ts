import { z } from 'zod';

/**
 * Donation Validators
 * Schemas wrapped in { body, query, params } for the validate() middleware.
 */

const paymentTypeEnum = z.enum(['DONATION', 'ZAKAT', 'MEMBER_FEE', 'CHARITY']);
const methodEnum = z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'WALLET', 'CHEQUE', 'STRIPE']);
const statusEnum = z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']);
const periodMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Amount is accepted as a STRING, never coerced through a JS number, so it can
 * be handed straight to `new Prisma.Decimal(...)` without ever round-tripping
 * through binary floating point (DARE2CARE-9 §2.1). `\d{1,10}` before the
 * decimal point matches the column's `Decimal(12,2)` precision (12 total
 * digits, 2 after the point => up to 10 before it).
 */
const amountSchema = z
  .string({
    required_error: 'Amount is required',
    invalid_type_error: 'Amount must be a string (e.g. "1500.00"), not a number',
  })
  .regex(/^\d{1,10}(\.\d{1,2})?$/, 'Amount must be a positive number with up to 2 decimal places')
  .refine((v) => Number(v) > 0, { message: 'Amount must be greater than 0' });

/**
 * `status` and `currency` are intentionally NOT accepted here (DARE2CARE-9 §2.4).
 * The service owns both: status is derived from how the donation was created
 * (manual entry vs. gateway-initiated); currency is always the schema default.
 * Accepting either from the client let an operator record e.g. `USD 5000` into
 * a table that `summary()` sums indiscriminately as PKR, or fabricate a
 * COMPLETED status for a gateway-initiated donation that never actually paid.
 */
export const createDonationSchema = z.object({
  body: z
    .object({
      amount: amountSchema,
      paymentType: paymentTypeEnum.optional(),
      method: methodEnum.optional(),
      donorId: z.string().uuid('Invalid donor ID').optional().nullable(),
      donorName: z.string().min(1).max(200).optional().nullable(),
      donorEmail: z.string().email('Invalid email').optional().nullable(),
      note: z.string().max(1000).optional().nullable(),
      periodMonth: z
        .string()
        .regex(periodMonthRegex, 'periodMonth must be in YYYY-MM format')
        .optional()
        .nullable(),
      reference: z.string().max(200).optional().nullable(),
      receivedAt: z
        .string()
        .refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid date format' })
        .optional(),
    })
    .refine((b) => Boolean(b.donorId) || Boolean(b.donorName), {
      message: 'Either a linked donor or a donor name is required',
      path: ['donorName'],
    }),
});

export const donationFiltersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    donorId: z.string().uuid('Invalid donor ID').optional(),
    status: statusEnum.optional(),
    paymentType: paymentTypeEnum.optional(),
    method: methodEnum.optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    includeVoided: z.enum(['true', 'false']).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const donationIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid donation ID format'),
  }),
  query: z.object({
    includeVoided: z.enum(['true', 'false']).optional(),
  }),
});

/**
 * `manual` must be explicitly set true to record a non-gateway (bookkeeping)
 * refund. Its absence means "attempt a gateway refund" — see DonationService.refund
 * and DARE2CARE-9 §2.2 (a ledger refund on a Stripe donation must never be
 * silently recorded without contacting the gateway).
 */
export const refundDonationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid donation ID format'),
  }),
  body: z
    .object({
      manual: z.boolean().optional(),
    })
    .optional()
    .default({}),
});

export const voidDonationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid donation ID format'),
  }),
  body: z.object({
    voidReason: z.string().min(3, 'voidReason must be at least 3 characters').max(500),
  }),
});

export const subscriberDonationsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid subscriber ID format'),
  }),
  query: z.object({
    includeVoided: z.enum(['true', 'false']).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const donationIntentSchema = z.object({
  body: z.object({
    amount: amountSchema,
    paymentType: paymentTypeEnum.optional(),
    donorName: z.string().min(1).max(200).optional(),
    donorEmail: z.string().email('Invalid email').optional(),
    note: z.string().max(1000).optional(),
  }),
});
