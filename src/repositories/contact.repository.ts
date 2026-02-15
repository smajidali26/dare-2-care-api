import { PrismaClient, ContactSubmission, Prisma } from '@prisma/client';

/**
 * Contact Repository
 * Handles database operations for contact form submissions
 */
export class ContactRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create new contact submission
   */
  async create(data: Prisma.ContactSubmissionCreateInput): Promise<ContactSubmission> {
    return this.prisma.contactSubmission.create({
      data,
    });
  }

  /**
   * Find all contact submissions with filters
   */
  async findAll(filters: {
    isRead?: boolean;
    isReplied?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ data: ContactSubmission[]; total: number }> {
    const where: Prisma.ContactSubmissionWhereInput = {};

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    if (filters.isReplied !== undefined) {
      where.isReplied = filters.isReplied;
    }

    const total = await this.prisma.contactSubmission.count({ where });

    const data = await this.prisma.contactSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit,
      skip: filters.offset,
    });

    return { data, total };
  }

  /**
   * Find contact submission by ID
   */
  async findById(id: string): Promise<ContactSubmission | null> {
    return this.prisma.contactSubmission.findUnique({
      where: { id },
    });
  }

  /**
   * Mark as read
   */
  async markAsRead(id: string): Promise<ContactSubmission> {
    return this.prisma.contactSubmission.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Mark as replied
   */
  async markAsReplied(id: string): Promise<ContactSubmission> {
    return this.prisma.contactSubmission.update({
      where: { id },
      data: { isReplied: true },
    });
  }
}
