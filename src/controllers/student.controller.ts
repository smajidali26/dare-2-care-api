import { Request, Response } from 'express';
import * as studentService from '../services/student.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamAsString } from '../utils/params.util';
import { AppError } from '../utils/AppError';

/**
 * Student Controller
 * Handles student management HTTP requests
 */
export class StudentController {
  /**
   * GET /api/admin/students
   * List all students with pagination and filters
   */
  list = asyncHandler(async (req: Request, res: Response) => {
    const { search, page, limit, isActive, gender, grade, schoolName } = req.query;

    // Build filters
    const filters: any = {};
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (gender) filters.gender = gender;
    if (grade) filters.grade = grade;
    if (schoolName) filters.schoolName = schoolName;

    // Get students
    const result = await studentService.getAllStudents(
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
   * GET /api/admin/students/:id
   * Get single student by ID
   */
  get = asyncHandler(async (req: Request, res: Response) => {
    const id = getParamAsString(req.params.id);
    const student = await studentService.findById(id);

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  });

  /**
   * POST /api/admin/students
   * Create new student
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    // Convert date strings to Date objects if needed
    const studentData: any = { ...req.body };
    if (req.body.dateOfBirth) {
      studentData.dateOfBirth = new Date(req.body.dateOfBirth);
    }
    if (req.body.enrollmentDate) {
      studentData.enrollmentDate = new Date(req.body.enrollmentDate);
    }

    const student = await studentService.createStudent(studentData);

    res.status(201).json({
      success: true,
      data: student,
      message: 'Student created successfully',
    });
  });

  /**
   * PUT /api/admin/students/:id
   * Update student
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = getParamAsString(req.params.id);

    // Convert date strings to Date objects if needed
    const studentData: any = { ...req.body };
    if (req.body.dateOfBirth) {
      studentData.dateOfBirth = new Date(req.body.dateOfBirth);
    }
    if (req.body.enrollmentDate) {
      studentData.enrollmentDate = new Date(req.body.enrollmentDate);
    }

    const student = await studentService.updateStudent(id, studentData);

    res.status(200).json({
      success: true,
      data: student,
      message: 'Student updated successfully',
    });
  });

  /**
   * DELETE /api/admin/students/:id
   * Delete student (soft delete)
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = getParamAsString(req.params.id);
    await studentService.deleteStudent(id);

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
    });
  });
}
