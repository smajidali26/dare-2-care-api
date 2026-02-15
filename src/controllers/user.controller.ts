import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import * as userService from '../services/user.service';
import { getParamAsString } from '../utils/params.util';
import {
  createUserSchema,
  updateUserSchema,
  userQuerySchema,
} from '../validators/user.validator';
import { ApiError } from '../middleware/errorHandler.middleware';
import { ZodError } from 'zod';

/**
 * User Controller
 * Handles user management HTTP requests
 */

/**
 * Get all users
 * GET /api/admin/users
 */
export const getAllUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate query params
    const query = userQuerySchema.parse(req.query);

    // Build filters
    const filters: any = {};
    if (query.isActive !== undefined) filters.isActive = query.isActive;
    if (query.role) filters.role = query.role;

    // Get users
    const result = await userService.getAllUsers(
      query.search,
      filters,
      { page: query.page, limit: query.limit }
    );

    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
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
 * Get user by ID
 * GET /api/admin/users/:id
 */
export const getUserById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamAsString(req.params.id);

    const user = await userService.findById(id);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new user
 * POST /api/admin/users
 */
export const createUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const validatedData = createUserSchema.parse(req.body);

    // Create user
    const user = await userService.createUser(validatedData);

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ApiError(400, error.errors[0].message));
    } else if (error instanceof Error && error.message === 'Email already exists') {
      next(new ApiError(409, error.message));
    } else {
      next(error);
    }
  }
};

/**
 * Update user
 * PUT /api/admin/users/:id
 */
export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamAsString(req.params.id);

    // Validate request body
    const validatedData = updateUserSchema.parse(req.body);

    // Update user
    const user = await userService.updateUser(id, validatedData);

    res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ApiError(400, error.errors[0].message));
    } else if (error instanceof Error) {
      if (error.message === 'User not found') {
        next(new ApiError(404, error.message));
      } else if (error.message === 'Email already exists') {
        next(new ApiError(409, error.message));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};

/**
 * Delete user (soft delete)
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamAsString(req.params.id);

    // Prevent self-deletion
    if (req.user?.userId === id) {
      throw new ApiError(400, 'Cannot delete your own account');
    }

    // Delete user
    await userService.deleteUser(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      next(new ApiError(404, error.message));
    } else {
      next(error);
    }
  }
};
