import prisma from '../config/database.config';
import { User, Role } from '@prisma/client';
import { BaseRepository, PaginationOptions, FilterOptions } from './base.repository';

/**
 * User Repository
 * Handles all database operations for User model
 */

class UserRepository extends BaseRepository<User> {
  constructor() {
    super(prisma, 'user');
  }

  /**
   * Find user by email
   * @param email - User email
   * @returns User object or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        email,
        isDeleted: false,
      },
    });
  }

  /**
   * Update last login timestamp
   * @param userId - User ID
   * @returns Updated user object
   */
  async updateLastLogin(userId: string): Promise<User> {
    return prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  /**
   * Search users with filters
   * @param searchTerm - Search term for email or name
   * @param filters - Additional filters
   * @param pagination - Pagination options
   * @returns Paginated users
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
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { fullName: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          isDeleted: false,
        },
      }),
      prisma.user.count({ where }),
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
   * @param email - User email
   * @param excludeId - Optional user ID to exclude from check
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

    const count = await prisma.user.count({ where });
    return count > 0;
  }
}

export default new UserRepository();
