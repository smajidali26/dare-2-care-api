import { z } from 'zod';

/**
 * Student Request Validators
 * Uses Zod for request validation
 */

/**
 * Create student schema
 */
export const createStudentSchema = z.object({
  fullName: z
    .string({
      required_error: 'Full name is required',
    })
    .min(2, 'Full name must be at least 2 characters')
    .trim(),
  dateOfBirth: z
    .string({
      required_error: 'Date of birth is required',
    })
    .transform((val) => {
      // Accept both date (YYYY-MM-DD) and datetime (ISO 8601) formats
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return new Date(val + 'T00:00:00Z').toISOString();
      }
      return new Date(val).toISOString();
    }),
  gender: z
    .string({
      required_error: 'Gender is required',
    })
    .min(1, 'Gender is required')
    .trim(),
  guardianName: z
    .string({
      required_error: 'Guardian name is required',
    })
    .min(2, 'Guardian name must be at least 2 characters')
    .trim(),
  guardianPhone: z
    .string({
      required_error: 'Guardian phone is required',
    })
    .regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format')
    .trim(),
  guardianEmail: z
    .string()
    .email('Invalid email format')
    .toLowerCase()
    .trim()
    .optional()
    .nullable(),
  schoolName: z
    .string({
      required_error: 'School name is required',
    })
    .min(2, 'School name must be at least 2 characters')
    .trim(),
  grade: z
    .string({
      required_error: 'Grade is required',
    })
    .min(1, 'Grade is required')
    .trim(),
  enrollmentDate: z
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
 * Update student schema
 */
export const updateStudentSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .trim()
    .optional(),
  dateOfBirth: z
    .string()
    .transform((val) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return new Date(val + 'T00:00:00Z').toISOString();
      }
      return new Date(val).toISOString();
    })
    .optional(),
  gender: z
    .string()
    .min(1, 'Gender is required')
    .trim()
    .optional(),
  guardianName: z
    .string()
    .min(2, 'Guardian name must be at least 2 characters')
    .trim()
    .optional(),
  guardianPhone: z
    .string()
    .regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number format')
    .trim()
    .optional(),
  guardianEmail: z
    .string()
    .email('Invalid email format')
    .toLowerCase()
    .trim()
    .optional()
    .nullable(),
  schoolName: z
    .string()
    .min(2, 'School name must be at least 2 characters')
    .trim()
    .optional(),
  grade: z
    .string()
    .min(1, 'Grade is required')
    .trim()
    .optional(),
  enrollmentDate: z
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
 * Student query params schema
 */
export const studentQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  gender: z.string().optional(),
  grade: z.string().optional(),
  schoolName: z.string().optional(),
});
