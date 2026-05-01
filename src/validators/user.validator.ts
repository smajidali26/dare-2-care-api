import { z } from 'zod';
import { Role } from '@prisma/client';

/**
 * User Request Validators
 * Schemas wrapped in { body, query, params } for the validate() middleware.
 */

const idParam = z.object({
  id: z.string().uuid('Invalid user ID format'),
});

const userBodyBase = {
  email: z
    .string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .trim(),
  role: z
    .enum([Role.SUPER_ADMIN, Role.ADMIN, Role.CONTENT_MANAGER], {
      invalid_type_error: 'Invalid role',
    }),
  isActive: z.boolean(),
};

export const createUserSchema = z.object({
  body: z.object({
    email: userBodyBase.email,
    password: userBodyBase.password,
    fullName: userBodyBase.fullName,
    role: userBodyBase.role.optional().default(Role.ADMIN),
    isActive: userBodyBase.isActive.optional().default(true),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    email: userBodyBase.email.optional(),
    password: userBodyBase.password.optional(),
    fullName: userBodyBase.fullName.optional(),
    role: userBodyBase.role.optional(),
    isActive: userBodyBase.isActive.optional(),
  }),
  params: idParam,
});

export const userIdSchema = z.object({
  params: idParam,
});

export const userQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    search: z.string().optional(),
    isActive: z.coerce.boolean().optional(),
    role: z
      .enum([Role.SUPER_ADMIN, Role.ADMIN, Role.CONTENT_MANAGER])
      .optional(),
  }),
});
