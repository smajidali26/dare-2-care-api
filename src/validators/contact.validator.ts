import { z } from 'zod';

/**
 * Contact Validators
 * Request validation schemas for contact form operations
 */

/**
 * Submit Contact Form Schema
 */
export const submitContactSchema = z.object({
  body: z.object({
    fullName: z
      .string()
      .min(1, 'Full name is required')
      .max(200, 'Full name must be less than 200 characters'),
    email: z
      .string()
      .email('Invalid email format')
      .min(1, 'Email is required'),
    phoneNumber: z
      .string()
      .max(20, 'Phone number must be less than 20 characters')
      .optional(),
    subject: z
      .string()
      .min(1, 'Subject is required')
      .max(200, 'Subject must be less than 200 characters'),
    message: z
      .string()
      .min(1, 'Message is required')
      .max(5000, 'Message must be less than 5000 characters'),
  }),
});

/**
 * Contact Submission Filters Schema (Admin)
 */
export const contactFiltersSchema = z.object({
  query: z.object({
    isRead: z
      .string()
      .optional()
      .transform((val) => val === 'true' || val === '1'),
    isReplied: z
      .string()
      .optional()
      .transform((val) => val === 'true' || val === '1'),
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
 * Contact Submission ID Param Schema
 */
export const contactIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid contact submission ID format'),
  }),
});
