import { z } from 'zod';

/**
 * Notification Validators
 * Request validation schemas for notification operations
 */

/**
 * Notification Filters Schema
 */
export const notificationFiltersSchema = z.object({
  query: z.object({
    subscriberId: z.string().uuid('Invalid subscriber ID format').optional(),
    notificationType: z
      .enum(['PAYMENT_REMINDER', 'EVENT_NOTIFICATION', 'GENERAL'])
      .optional(),
    channel: z.enum(['EMAIL', 'SMS', 'BOTH']).optional(),
    deliveryStatus: z.enum(['PENDING', 'SENT', 'DELIVERED', 'FAILED']).optional(),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20)),
  }),
});

/**
 * Notification ID Param Schema
 */
export const notificationIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid notification ID format'),
  }),
});
