import { z } from 'zod';
import { Role } from '@prisma/client';

/**
 * User Request Validators
 * Uses Zod for request validation
 */

/**
 * Create user schema
 */
export const createUserSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  password: z
    .string({
      required_error: 'Password is required',
    })
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  fullName: z
    .string({
      required_error: 'Full name is required',
    })
    .min(2, 'Full name must be at least 2 characters')
    .trim(),
  role: z
    .enum([Role.SUPER_ADMIN, Role.ADMIN, Role.CONTENT_MANAGER], {
      required_error: 'Role is required',
      invalid_type_error: 'Invalid role',
    })
    .default(Role.ADMIN),
  isActive: z.boolean().optional().default(true),
});

/**
 * Update user schema
 */
export const updateUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .toLowerCase()
    .trim()
    .optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .optional(),
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .trim()
    .optional(),
  role: z
    .enum([Role.SUPER_ADMIN, Role.ADMIN, Role.CONTENT_MANAGER], {
      invalid_type_error: 'Invalid role',
    })
    .optional(),
  isActive: z.boolean().optional(),
});

/**
 * User query params schema
 */
export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  role: z
    .enum([Role.SUPER_ADMIN, Role.ADMIN, Role.CONTENT_MANAGER])
    .optional(),
});
