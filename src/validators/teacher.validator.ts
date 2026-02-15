import { z } from 'zod';

/**
 * Teacher Request Validators
 * Uses Zod for request validation
 */

/**
 * Create teacher schema
 */
export const createTeacherSchema = z.object({
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
  subject: z
    .string({
      required_error: 'Subject is required',
    })
    .min(2, 'Subject must be at least 2 characters')
    .trim(),
  qualification: z
    .string({
      required_error: 'Qualification is required',
    })
    .min(2, 'Qualification must be at least 2 characters')
    .trim(),
  experience: z
    .number({
      required_error: 'Experience is required',
      invalid_type_error: 'Experience must be a number',
    })
    .int('Experience must be a whole number')
    .min(0, 'Experience cannot be negative'),
  hireDate: z
    .string()
    .transform((val) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return new Date(val + 'T00:00:00Z').toISOString();
      }
      return new Date(val).toISOString();
    })
    .optional(),
  isActive: z.boolean().optional().default(true),
});

/**
 * Update teacher schema
 */
export const updateTeacherSchema = z.object({
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
  subject: z
    .string()
    .min(2, 'Subject must be at least 2 characters')
    .trim()
    .optional(),
  qualification: z
    .string()
    .min(2, 'Qualification must be at least 2 characters')
    .trim()
    .optional(),
  experience: z
    .number({
      invalid_type_error: 'Experience must be a number',
    })
    .int('Experience must be a whole number')
    .min(0, 'Experience cannot be negative')
    .optional(),
  hireDate: z
    .string()
    .transform((val) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return new Date(val + 'T00:00:00Z').toISOString();
      }
      return new Date(val).toISOString();
    })
    .optional(),
  isActive: z.boolean().optional(),
});

/**
 * Teacher query params schema
 */
export const teacherQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  subject: z.string().optional(),
  minExperience: z.coerce.number().int().min(0).optional(),
});
