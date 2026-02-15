import { z } from 'zod';

/**
 * Authentication Request Validators
 * Uses Zod for request validation
 */

/**
 * Login request schema
 */
export const loginSchema = z.object({
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
    .min(1, 'Password is required'),
});

/**
 * Refresh token request schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({
      required_error: 'Refresh token is required',
    })
    .min(1, 'Refresh token is required'),
});
