import prisma from '../config/database.config';
import { Teacher } from '@prisma/client';
import { BaseRepository, PaginationOptions, FilterOptions } from './base.repository';

/**
 * Teacher Repository
 * Handles all database operations for Teacher model
 */

class TeacherRepository extends BaseRepository<Teacher> {
  constructor() {
    super(prisma, 'teacher');
  }

  /**
   * Find teacher by email
   * @param email - Teacher email
   * @returns Teacher object or null if not found
   */
  async findByEmail(email: string): Promise<Teacher | null> {
    return prisma.teacher.findFirst({
      where: {
        email,
        isDeleted: false,
      },
    });
  }

  /**
   * Search teachers with filters
   * @param searchTerm - Search term for name, email, phone, or subject
   * @param filters - Additional filters
   * @param pagination - Pagination options
   * @returns Paginated teachers
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
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phoneNumber: { contains: searchTerm, mode: 'insensitive' } },
        { subject: { contains: searchTerm, mode: 'insensitive' } },
        { qualification: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.teacher.count({ where }),
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
   * Check if email exists
   * @param email - Teacher email
   * @param excludeId - Optional teacher ID to exclude from check
   * @returns Boolean
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const where: any = {
      email,
      isDeleted: false,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await prisma.teacher.count({ where });
    return count > 0;
  }

  /**
   * Find active teachers
   * @param pagination - Pagination options
   * @returns Paginated active teachers
   */
  async findActive(pagination: PaginationOptions = {}) {
    return this.search(undefined, { isActive: true }, pagination);
  }

  /**
   * Find teachers by subject
   * @param subject - Subject
   * @param pagination - Pagination options
   * @returns Paginated teachers
   */
  async findBySubject(subject: string, pagination: PaginationOptions = {}) {
    return this.search(undefined, { subject }, pagination);
  }

  /**
   * Find teachers by minimum experience
   * @param minExperience - Minimum years of experience
   * @param pagination - Pagination options
   * @returns Paginated teachers
   */
  async findByMinExperience(minExperience: number, pagination: PaginationOptions = {}) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
      experience: {
        gte: minExperience,
      },
    };

    const [data, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.teacher.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export default new TeacherRepository();
