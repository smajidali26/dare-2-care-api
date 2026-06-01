import { z } from 'zod';

/**
 * Donation Validators
 * Schemas wrapped in { body, query, params } for the validate() middleware.
 */

const paymentTypeEnum = z.enum(['DONATION', 'ZAKAT', 'MEMBER_FEE', 'CHARITY']);
const methodEnum = z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'WALLET', 'CHEQUE', 'STRIPE']);
const statusEnum = z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']);

export const createDonationSchema = z.object({
  body: z
    .object({
      amount: z.coerce
        .number({ invalid_type_error: 'Amount must be a number' })
        .positive('Amount must be greater than 0'),
      currency: z.string().length(3, 'Currency must be a 3-letter code').optional(),
      paymentType: paymentTypeEnum.optional(),
      method: methodEnum.optional(),
      status: statusEnum.optional(),
      donorId: z.string().uuid('Invalid donor ID').optional().nullable(),
      donorName: z.string().min(1).max(200).optional().nullable(),
      donorEmail: z.string().email('Invalid email').optional().nullable(),
      note: z.string().max(1000).optional().nullable(),
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
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const donationIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid donation ID format'),
  }),
});

export const donationIntentSchema = z.object({
  body: z.object({
    amount: z.coerce
      .number({ invalid_type_error: 'Amount must be a number' })
      .positive('Amount must be greater than 0'),
    paymentType: paymentTypeEnum.optional(),
    donorName: z.string().min(1).max(200).optional(),
    donorEmail: z.string().email('Invalid email').optional(),
    note: z.string().max(1000).optional(),
  }),
});
