import { PrismaClient } from '@prisma/client';

/**
 * Base Repository Interface
 * Generic CRUD operations for all entities
 */

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterOptions {
  [key: string]: any;
}

/**
 * Base Repository Class
 * Provides generic CRUD operations for Prisma models
 */
export class BaseRepository<T> {
  protected model: any;
  protected prisma: PrismaClient;

  constructor(prisma: PrismaClient, modelName: string) {
    this.prisma = prisma;
    this.model = (prisma as any)[modelName];
  }

  /**
   * Find all records with optional filtering and pagination
   * @param filters - Query filters
   * @param pagination - Pagination options
   * @returns Paginated result
   */
  async findAll(
    filters: FilterOptions = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause (exclude soft deleted by default)
    const where = {
      ...filters,
      isDeleted: false,
    };

    // Execute query with pagination
    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.model.count({ where }),
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
   * Find record by ID (exclude soft deleted)
   * @param id - Record ID
   * @returns Record or null
   */
  async findById(id: string): Promise<T | null> {
    return this.model.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });
  }

  /**
   * Create new record
   * @param data - Record data
   * @returns Created record
   */
  async create(data: Partial<T>): Promise<T> {
    return this.model.create({
      data,
    });
  }

  /**
   * Update existing record
   * @param id - Record ID
   * @param data - Updated data
   * @returns Updated record
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    return this.model.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete record (set isDeleted = true)
   * @param id - Record ID
   * @returns Updated record
   */
  async softDelete(id: string): Promise<T> {
    return this.model.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Restore soft deleted record
   * @param id - Record ID
   * @returns Restored record
   */
  async restore(id: string): Promise<T> {
    return this.model.update({
      where: { id },
      data: {
        isDeleted: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Count records matching criteria
   * @param filters - Query filters
   * @returns Count
   */
  async count(filters: FilterOptions = {}): Promise<number> {
    return this.model.count({
      where: {
        ...filters,
        isDeleted: false,
      },
    });
  }

  /**
   * Check if record exists
   * @param id - Record ID
   * @returns Boolean
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.model.count({
      where: {
        id,
        isDeleted: false,
      },
    });
    return count > 0;
  }
}
