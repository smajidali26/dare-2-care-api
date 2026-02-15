import { Request } from 'express';

/**
 * Authentication Type Definitions
 */

/**
 * Login request body
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      fullName: string;
      role: string;
      lastLoginAt: Date | null;
    };
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Refresh token request body
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * JWT payload structure
 */
export interface UserPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Authenticated request with user attached
 */
export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}
