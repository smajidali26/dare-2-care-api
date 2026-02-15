import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import * as studentService from '../services/student.service';
import { getParamAsString } from '../utils/params.util';
import {
  createStudentSchema,
  updateStudentSchema,
  studentQuerySchema,
} from '../validators/student.validator';
import { ApiError } from '../middleware/errorHandler.middleware';
import { ZodError } from 'zod';

/**
 * Student Controller
 * Handles student management HTTP requests
 */

/**
 * Get all students
 * GET /api/admin/students
 */
export const getAllStudents = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate query params
    const query = studentQuerySchema.parse(req.query);

    // Build filters
    const filters: any = {};
    if (query.isActive !== undefined) filters.isActive = query.isActive;
    if (query.gender) filters.gender = query.gender;
    if (query.grade) filters.grade = query.grade;
    if (query.schoolName) filters.schoolName = query.schoolName;

    // Get students
    const result = await studentService.getAllStudents(
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
 * Get student by ID
 * GET /api/admin/students/:id
 */
export const getStudentById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamAsString(req.params.id);

    const student = await studentService.findById(id);

    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new student
 * POST /api/admin/students
 */
export const createStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const validatedData = createStudentSchema.parse(req.body);

    // Convert date strings to Date objects if needed
    const studentData: any = { ...validatedData };
    if (validatedData.dateOfBirth) {
      studentData.dateOfBirth = new Date(validatedData.dateOfBirth);
    }
    if (validatedData.enrollmentDate) {
      studentData.enrollmentDate = new Date(validatedData.enrollmentDate);
    }

    // Create student
    const student = await studentService.createStudent(studentData);

    res.status(201).json({
      success: true,
      data: student,
      message: 'Student created successfully',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ApiError(400, error.errors[0].message));
    } else if (error instanceof Error && error.message.includes('age')) {
      next(new ApiError(400, error.message));
    } else {
      next(error);
    }
  }
};

/**
 * Update student
 * PUT /api/admin/students/:id
 */
export const updateStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamAsString(req.params.id);

    // Validate request body
    const validatedData = updateStudentSchema.parse(req.body);

    // Convert date strings to Date objects if needed
    const studentData: any = { ...validatedData };
    if (validatedData.dateOfBirth) {
      studentData.dateOfBirth = new Date(validatedData.dateOfBirth);
    }
    if (validatedData.enrollmentDate) {
      studentData.enrollmentDate = new Date(validatedData.enrollmentDate);
    }

    // Update student
    const student = await studentService.updateStudent(id, studentData);

    res.status(200).json({
      success: true,
      data: student,
      message: 'Student updated successfully',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ApiError(400, error.errors[0].message));
    } else if (error instanceof Error) {
      if (error.message === 'Student not found') {
        next(new ApiError(404, error.message));
      } else if (error.message.includes('age')) {
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
 * Delete student (soft delete)
 * DELETE /api/admin/students/:id
 */
export const deleteStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamAsString(req.params.id);

    // Delete student
    await studentService.deleteStudent(id);

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Student not found') {
      next(new ApiError(404, error.message));
    } else {
      next(error);
    }
  }
};
