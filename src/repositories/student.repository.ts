import prisma from '../config/database.config';
import { Student } from '@prisma/client';
import { BaseRepository, PaginationOptions, FilterOptions } from './base.repository';

/**
 * Student Repository
 * Handles all database operations for Student model
 */

class StudentRepository extends BaseRepository<Student> {
  constructor() {
    super(prisma, 'student');
  }

  /**
   * Search students with filters
   * @param searchTerm - Search term for name, guardian, or school
   * @param filters - Additional filters
   * @param pagination - Pagination options
   * @returns Paginated students
   */
  async search(
    searchTerm?: string,
    filters: FilterOptions = {},
    pagination: PaginationOptions = {}
  ) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
      ...filters,
    };

    if (searchTerm) {
      where.OR = [
        { fullName: { contains: searchTerm, mode: 'insensitive' } },
        { guardianName: { contains: searchTerm, mode: 'insensitive' } },
        { guardianPhone: { contains: searchTerm, mode: 'insensitive' } },
        { guardianEmail: { contains: searchTerm, mode: 'insensitive' } },
        { schoolName: { contains: searchTerm, mode: 'insensitive' } },
        { grade: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.student.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find active students
   * @param pagination - Pagination options
   * @returns Paginated active students
   */
  async findActive(pagination: PaginationOptions = {}) {
    return this.search(undefined, { isActive: true }, pagination);
  }

  /**
   * Find students by school
   * @param schoolName - School name
   * @param pagination - Pagination options
   * @returns Paginated students
   */
  async findBySchool(schoolName: string, pagination: PaginationOptions = {}) {
    return this.search(undefined, { schoolName }, pagination);
  }

  /**
   * Find students by grade
   * @param grade - Grade
   * @param pagination - Pagination options
   * @returns Paginated students
   */
  async findByGrade(grade: string, pagination: PaginationOptions = {}) {
    return this.search(undefined, { grade }, pagination);
  }

  /**
   * Find students by gender
   * @param gender - Gender
   * @param pagination - Pagination options
   * @returns Paginated students
   */
  async findByGender(gender: string, pagination: PaginationOptions = {}) {
    return this.search(undefined, { gender }, pagination);
  }
}

export default new StudentRepository();
