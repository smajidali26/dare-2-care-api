import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import * as teacherService from '../services/teacher.service';
import { getParamAsString } from '../utils/params.util';
import {
  createTeacherSchema,
  updateTeacherSchema,
  teacherQuerySchema,
} from '../validators/teacher.validator';
import { ApiError } from '../middleware/errorHandler.middleware';
import { ZodError } from 'zod';

/**
 * Teacher Controller
 * Handles teacher management HTTP requests
 */

/**
 * Get all teachers
 * GET /api/admin/teachers
 */
export const getAllTeachers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate query params
    const query = teacherQuerySchema.parse(req.query);

    // Build filters
    const filters: any = {};
    if (query.isActive !== undefined) filters.isActive = query.isActive;
    if (query.subject) filters.subject = query.subject;

    // Get teachers
    const result = await teacherService.getAllTeachers(
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
 * Get teacher by ID
 * GET /api/admin/teachers/:id
 */
export const getTeacherById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamAsString(req.params.id);

    const teacher = await teacherService.findById(id);

    if (!teacher) {
      throw new ApiError(404, 'Teacher not found');
    }

    res.status(200).json({
      success: true,
      data: teacher,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new teacher
 * POST /api/admin/teachers
 */
export const createTeacher = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const validatedData = createTeacherSchema.parse(req.body);

    // Convert date strings to Date objects if needed
    const teacherData: any = { ...validatedData };
    if (validatedData.hireDate) {
      teacherData.hireDate = new Date(validatedData.hireDate);
    }

    // Create teacher
    const teacher = await teacherService.createTeacher(teacherData);

    res.status(201).json({
      success: true,
      data: teacher,
      message: 'Teacher created successfully',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ApiError(400, error.errors[0].message));
    } else if (error instanceof Error && error.message === 'Email already exists') {
      next(new ApiError(409, error.message));
    } else if (error instanceof Error && error.message.includes('experience')) {
      next(new ApiError(400, error.message));
    } else {
      next(error);
    }
  }
};

/**
 * Update teacher
 * PUT /api/admin/teachers/:id
 */
export const updateTeacher = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamAsString(req.params.id);

    // Validate request body
    const validatedData = updateTeacherSchema.parse(req.body);

    // Convert date strings to Date objects if needed
    const teacherData: any = { ...validatedData };
    if (validatedData.hireDate) {
      teacherData.hireDate = new Date(validatedData.hireDate);
    }

    // Update teacher
    const teacher = await teacherService.updateTeacher(id, teacherData);

    res.status(200).json({
      success: true,
      data: teacher,
      message: 'Teacher updated successfully',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ApiError(400, error.errors[0].message));
    } else if (error instanceof Error) {
      if (error.message === 'Teacher not found') {
        next(new ApiError(404, error.message));
      } else if (error.message === 'Email already exists') {
        next(new ApiError(409, error.message));
      } else if (error.message.includes('experience')) {
        next(new ApiError(400, error.message));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};

/**
 * Delete teacher (soft delete)
 * DELETE /api/admin/teachers/:id
 */
export const deleteTeacher = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamAsString(req.params.id);

    // Delete teacher
    await teacherService.deleteTeacher(id);

    res.status(200).json({
      success: true,
      message: 'Teacher deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Teacher not found') {
      next(new ApiError(404, error.message));
    } else {
      next(error);
    }
  }
};
