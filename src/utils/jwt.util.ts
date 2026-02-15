import jwt, { SignOptions } from 'jsonwebtoken';

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
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  const expiry = expiresIn || process.env.JWT_EXPIRES_IN || '1h';

  return jwt.sign(payload, secret, { expiresIn: expiry } as SignOptions);
};

/**
 * Generate refresh token
 * @param payload - User payload to encode in refresh token
 * @returns Signed refresh token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
  }

  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
};

/**
 * Verify access token
 * @param token - JWT token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export const verifyToken = (token: string): TokenPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.verify(token, secret) as TokenPayload;
};

/**
 * Verify refresh token
 * @param token - Refresh token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
  }

  return jwt.verify(token, secret) as TokenPayload;
};
