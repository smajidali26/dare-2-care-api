import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.config';

/**
 * JWT Utilities
 * Handles JWT token generation and verification
 */

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generate access token
 * @param payload - User payload to encode in token
 * @param expiresIn - Token expiration time (default from env)
 * @returns Signed JWT token
 */
export const generateToken = (
  payload: TokenPayload,
  expiresIn?: string
): string => {
  const expiry = expiresIn || env.JWT_EXPIRES_IN || '1h';

  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: expiry } as SignOptions);
};

/**
 * Generate refresh token
 * @param payload - User payload to encode in refresh token
 * @returns Signed refresh token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  const expiresIn = env.JWT_REFRESH_EXPIRES_IN || '7d';

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn } as SignOptions);
};

/**
 * Verify access token
 * @param token - JWT token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
};

/**
 * Verify refresh token
 * @param token - Refresh token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
};
