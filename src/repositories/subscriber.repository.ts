import prisma from '../config/database.config';
import { Subscriber } from '@prisma/client';
import { BaseRepository, PaginationOptions, FilterOptions } from './base.repository';

/**
 * Subscriber Repository
 * Handles all database operations for Subscriber model
 */

class SubscriberRepository extends BaseRepository<Subscriber> {
  constructor() {
    super(prisma, 'subscriber');
  }

  /**
   * Find subscriber by email
   * @param email - Subscriber email
   * @returns Subscriber object or null if not found
   */
  async findByEmail(email: string): Promise<Subscriber | null> {
    return prisma.subscriber.findFirst({
      where: {
        email,
        isDeleted: false,
      },
    });
  }

  /**
   * Search subscribers with filters
   * @param searchTerm - Search term for email, name, or phone
   * @param filters - Additional filters
   * @param pagination - Pagination options
   * @returns Paginated subscribers
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
        { phoneNumber: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.subscriber.count({ where }),
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
   * @param email - Subscriber email
   * @param excludeId - Optional subscriber ID to exclude from check
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

    const count = await prisma.subscriber.count({ where });
    return count > 0;
  }

  /**
   * Find active subscribers
   * @param pagination - Pagination options
   * @returns Paginated active subscribers
   */
  async findActive(pagination: PaginationOptions = {}) {
    return this.search(undefined, { isActive: true }, pagination);
  }

  /**
   * Find subscribers by payment day
   * @param dayOfMonth - Day of month
   * @param pagination - Pagination options
   * @returns Paginated subscribers
   */
  async findByPaymentDay(dayOfMonth: number, pagination: PaginationOptions = {}) {
    return this.search(undefined, { paymentDayOfMonth: dayOfMonth, isActive: true }, pagination);
  }

  /**
   * Find management members
   * @returns Array of management members ordered by displayOrder
   */
  async findManagementMembers(): Promise<Subscriber[]> {
    return prisma.subscriber.findMany({
      where: {
        isManagement: true,
        isActive: true,
        isDeleted: false,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }
}

export { SubscriberRepository };
export default new SubscriberRepository();
