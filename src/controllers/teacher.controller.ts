import { Request, Response } from 'express';
import * as teacherService from '../services/teacher.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamAsString } from '../utils/params.util';
import { AppError } from '../utils/AppError';

/**
 * Teacher Controller
 * Handles teacher management HTTP requests
 */
export class TeacherController {
  /**
   * GET /api/admin/teachers
   * List all teachers with pagination and filters
   */
  list = asyncHandler(async (req: Request, res: Response) => {
    const { search, page, limit, isActive, subject } = req.query;

    // Build filters
    const filters: any = {};
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (subject) filters.subject = subject;

    // Get teachers
    const result = await teacherService.getAllTeachers(
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
   * GET /api/admin/teachers/:id
   * Get single teacher by ID
   */
  get = asyncHandler(async (req: Request, res: Response) => {
    const id = getParamAsString(req.params.id);
    const teacher = await teacherService.findById(id);

    if (!teacher) {
      throw new AppError('Teacher not found', 404);
    }

    res.status(200).json({
      success: true,
      data: teacher,
    });
  });

  /**
   * POST /api/admin/teachers
   * Create new teacher
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    // Convert date strings to Date objects if needed
    const teacherData: any = { ...req.body };
    if (req.body.hireDate) {
      teacherData.hireDate = new Date(req.body.hireDate);
    }

    const teacher = await teacherService.createTeacher(teacherData);

    res.status(201).json({
      success: true,
      data: teacher,
      message: 'Teacher created successfully',
    });
  });

  /**
   * PUT /api/admin/teachers/:id
   * Update teacher
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = getParamAsString(req.params.id);

    // Convert date strings to Date objects if needed
    const teacherData: any = { ...req.body };
    if (req.body.hireDate) {
      teacherData.hireDate = new Date(req.body.hireDate);
    }

    const teacher = await teacherService.updateTeacher(id, teacherData);

    res.status(200).json({
      success: true,
      data: teacher,
      message: 'Teacher updated successfully',
    });
  });

  /**
   * DELETE /api/admin/teachers/:id
   * Delete teacher (soft delete)
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = getParamAsString(req.params.id);
    await teacherService.deleteTeacher(id);

    res.status(200).json({
      success: true,
      message: 'Teacher deleted successfully',
    });
  });

  restore = asyncHandler(async (req: Request, res: Response) => {
    const id = getParamAsString(req.params.id);
    const teacher = await teacherService.restoreTeacher(id);
    res.status(200).json({
      success: true,
      data: teacher,
      message: 'Teacher restored successfully',
    });
  });
}
