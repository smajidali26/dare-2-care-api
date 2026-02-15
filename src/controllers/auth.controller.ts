import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import * as authService from '../services/auth.service';
import * as userService from '../services/user.service';
import { loginSchema, refreshTokenSchema } from '../validators/auth.validator';
import { ApiError } from '../middleware/errorHandler.middleware';
import { ZodError } from 'zod';

/**
 * Authentication Controller
 * Handles authentication-related HTTP requests
 */

/**
 * Login endpoint
 * POST /api/auth/login
 */
export const login = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);

    // Authenticate user
    const result = await authService.login(
      validatedData.email,
      validatedData.password
    );

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Optionally set access token in cookie as well
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    // Send response
    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ApiError(400, error.errors[0].message));
    } else {
      next(error);
    }
  }
};

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
export const logout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    // Call logout service (future: token blacklisting)
    await authService.logout();

    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user endpoint
 * GET /api/auth/me
 */
export const me = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    // Get full user details
    const user = await userService.findById(req.user.userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh token endpoint
 * POST /api/auth/refresh
 */
export const refresh = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get refresh token from body or cookie
    let refreshToken = req.body.refreshToken;

    if (!refreshToken && req.cookies?.refreshToken) {
      refreshToken = req.cookies.refreshToken;
    }

    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token required');
    }

    // Validate refresh token
    const validatedData = refreshTokenSchema.parse({ refreshToken });

    // Generate new tokens
    const result = await authService.refreshToken(validatedData.refreshToken);

    // Update cookies
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ApiError(400, error.errors[0].message));
    } else {
      next(error);
    }
  }
};
