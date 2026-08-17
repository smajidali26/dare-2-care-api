import { z } from 'zod';

/**
 * Reconciliation Validators (DARE2CARE-12)
 */
const periodMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export const reconciliationQuerySchema = z.object({
  query: z.object({
    period: z.string().regex(periodMonthRegex, 'period must be in YYYY-MM format').optional(),
    status: z.enum(['PAID', 'PARTIAL', 'UNPAID']).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});
