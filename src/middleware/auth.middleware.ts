import { Response, NextFunction } from 'express';
import { ApiError } from './errorHandler.middleware';
import { verifyToken } from '../utils/jwt.util';
import { AuthenticatedRequest, UserPayload } from '../types/auth.types';
import * as userService from '../services/user.service';

/**
 * Authentication Middleware
 * Protects routes and validates user permissions
 */

/**
 * Authenticate JWT token from Authorization header or cookies
 * Attaches user payload to request object
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check Authorization header first (format: "Bearer <token>")
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Fall back to cookie if no header token
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new ApiError(401, 'Authentication token required');
    }

    // Verify token
    const payload: UserPayload = verifyToken(token);

    // Verify user still exists and is active
    const user = await userService.findById(payload.userId);

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'Account is inactive');
    }

    // Attach user to request
    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require specific role(s) to access route
 * Must be used after authenticateToken middleware
 * @param roles - Array of allowed roles
 */
export const requireRole = (roles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      if (!roles.includes(req.user.role)) {
        throw new ApiError(
          403,
          'Insufficient permissions to access this resource'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
