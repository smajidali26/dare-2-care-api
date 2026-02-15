import { ApiError } from '../middleware/errorHandler.middleware';
import * as userService from './user.service';
import { comparePassword } from '../utils/bcrypt.util';
import {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
} from '../utils/jwt.util';
import { UserPayload } from '../types/auth.types';

/**
 * Authentication Service
 * Handles authentication business logic
 */

/**
 * Login user with email and password
 * @param email - User email
 * @param password - User password
 * @returns User data and tokens
 */
export const login = async (
  email: string,
  password: string
): Promise<{
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    lastLoginAt: Date | null;
  };
  accessToken: string;
  refreshToken: string;
}> => {
  // Find user by email
  const user = await userService.findByEmail(email);

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new ApiError(401, 'Account is inactive');
  }

  // Compare password
  const isPasswordValid = await comparePassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Update last login timestamp
  const updatedUser = await userService.updateLastLogin(user.id);

  // Create JWT payload
  const payload: UserPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  // Generate tokens
  const accessToken = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      role: updatedUser.role,
      lastLoginAt: updatedUser.lastLoginAt,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Validate JWT token
 * @param token - JWT token
 * @returns Decoded user payload
 */
export const validateToken = (token: string): UserPayload => {
  try {
    return verifyToken(token);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired token');
  }
};

/**
 * Refresh access token using refresh token
 * @param refreshToken - Refresh token
 * @returns New access token and refresh token
 */
export const refreshToken = async (
  refreshToken: string
): Promise<{
  accessToken: string;
  refreshToken: string;
}> => {
  try {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Verify user still exists and is active
    const user = await userService.findById(payload.userId);

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'Account is inactive');
    }

    // Generate new tokens
    const newPayload: UserPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const newAccessToken = generateToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
};

/**
 * Logout user
 * Note: With stateless JWT, logout is handled client-side by removing tokens
 * This method is a placeholder for future token blacklisting implementation
 */
export const logout = async (): Promise<void> => {
  // Future implementation: Add token to blacklist/revocation list
  // For now, client-side token removal is sufficient
  return;
};
