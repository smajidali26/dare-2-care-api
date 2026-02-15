import { z } from 'zod';

/**
 * Subscriber Request Validators
 * Uses Zod for request validation
 */

/**
 * Create subscriber schema
 */
export const createSubscriberSchema = z.object({
  fullName: z
    .string({
      required_error: 'Full name is required',
    })
    .min(2, 'Full name must be at least 2 characters')
    .trim(),
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  phoneNumber: z
    .string({
      required_error: 'Phone number is required',
    })
    .regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format')
    .trim(),
  monthlyDonationAmount: z
    .number({
      required_error: 'Monthly donation amount is required',
      invalid_type_error: 'Monthly donation amount must be a number',
    })
    .positive('Monthly donation amount must be positive')
    .multipleOf(0.01, 'Invalid decimal places'),
  paymentDayOfMonth: z
    .number({
      invalid_type_error: 'Payment day must be a number',
    })
    .int('Payment day must be an integer')
    .min(1, 'Payment day must be between 1 and 28')
    .max(28, 'Payment day must be between 1 and 28')
    .optional()
    .default(1),
  emailNotifications: z.boolean().optional().default(true),
  smsNotifications: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
  subscriptionStartDate: z
    .string()
    .transform((val) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return new Date(val + 'T00:00:00Z').toISOString();
      }
      return new Date(val).toISOString();
    })
    .optional(),
  subscriptionEndDate: z
    .string()
    .transform((val) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return new Date(val + 'T00:00:00Z').toISOString();
      }
      return new Date(val).toISOString();
    })
    .optional()
    .nullable(),
  subscriberType: z.enum(['PERMANENT', 'GENERAL', 'SUPPORTER'], {
    required_error: 'Subscriber type is required',
  }),
  paymentType: z.enum(['DONATION', 'ZAKAT', 'MEMBER_FEE', 'CHARITY'], {
    required_error: 'Payment type is required',
  }),
  profileImageUrl: z.string().url('Invalid URL format').optional().nullable(),
  isManagement: z.boolean().optional().default(false),
  managementRole: z.string().optional().nullable(),
  managementBio: z.string().optional().nullable(),
  displayOrder: z.number().int().optional().default(0),
});

/**
 * Update subscriber schema
 */
export const updateSubscriberSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .trim()
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .toLowerCase()
    .trim()
    .optional(),
  phoneNumber: z
    .string()
    .regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format')
    .trim()
    .optional(),
  monthlyDonationAmount: z
    .number({
      invalid_type_error: 'Monthly donation amount must be a number',
    })
    .positive('Monthly donation amount must be positive')
    .multipleOf(0.01, 'Invalid decimal places')
    .optional(),
  paymentDayOfMonth: z
    .number({
      invalid_type_error: 'Payment day must be a number',
    })
    .int('Payment day must be an integer')
    .min(1, 'Payment day must be between 1 and 28')
    .max(28, 'Payment day must be between 1 and 28')
    .optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  isActive: z.boolean().optional(),
  subscriptionStartDate: z
    .string()
    .transform((val) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return new Date(val + 'T00:00:00Z').toISOString();
      }
      return new Date(val).toISOString();
    })
    .optional(),
  subscriptionEndDate: z
    .string()
    .transform((val) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return new Date(val + 'T00:00:00Z').toISOString();
      }
      return new Date(val).toISOString();
    })
    .optional()
    .nullable(),
  subscriberType: z.enum(['PERMANENT', 'GENERAL', 'SUPPORTER']).optional(),
  paymentType: z.enum(['DONATION', 'ZAKAT', 'MEMBER_FEE', 'CHARITY']).optional(),
  profileImageUrl: z.string().url('Invalid URL format').optional().nullable(),
  isManagement: z.boolean().optional(),
  managementRole: z.string().optional().nullable(),
  managementBio: z.string().optional().nullable(),
  displayOrder: z.number().int().optional(),
});

/**
 * Subscriber query params schema
 */
export const subscriberQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  isManagement: z.coerce.boolean().optional(),
  paymentDayOfMonth: z.coerce.number().int().min(1).max(28).optional(),
  subscriberType: z.enum(['PERMANENT', 'GENERAL', 'SUPPORTER']).optional(),
  paymentType: z.enum(['DONATION', 'ZAKAT', 'MEMBER_FEE', 'CHARITY']).optional(),
});
