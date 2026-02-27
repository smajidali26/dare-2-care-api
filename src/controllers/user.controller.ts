import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamAsString } from '../utils/params.util';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../types/auth.types';

/**
 * User Controller
 * Handles user management HTTP requests
 */
export class UserController {
  /**
   * GET /api/admin/users
   * List all users with pagination and filters
   */
  list = asyncHandler(async (req: Request, res: Response) => {
    const { search, page, limit, isActive, role } = req.query;

    // Build filters
    const filters: any = {};
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (role) filters.role = role;

    // Get users
    const result = await userService.getAllUsers(
      search as string | undefined,
      filters,
      { page: Number(page) || 1, limit: Number(limit) || 10 }
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
  });

  /**
   * GET /api/admin/users/:id
   * Get single user by ID
   */
  get = asyncHandler(async (req: Request, res: Response) => {
    const id = getParamAsString(req.params.id);
    const user = await userService.findById(id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  });

  /**
   * POST /api/admin/users
   * Create new user
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.createUser(req.body);

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully',
    });
  });

  /**
   * PUT /api/admin/users/:id
   * Update user
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = getParamAsString(req.params.id);
    const user = await userService.updateUser(id, req.body);

    res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully',
    });
  });

  /**
   * DELETE /api/admin/users/:id
   * Delete user (soft delete)
   */
  delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = getParamAsString(req.params.id);

    // Prevent self-deletion
    if (req.user?.userId === id) {
      throw new AppError('Cannot delete your own account', 400);
    }

    await userService.deleteUser(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  });
}
