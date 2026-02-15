import { PrismaClient, NotificationLog, Prisma } from '@prisma/client';

/**
 * Notification Repository
 * Handles database operations for notification logs
 */
export class NotificationRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create notification log
   */
  async create(data: Prisma.NotificationLogCreateInput): Promise<NotificationLog> {
    return this.prisma.notificationLog.create({
      data,
    });
  }

  /**
   * Find all notification logs with filters
   */
  async findAll(filters: {
    subscriberId?: string;
    notificationType?: string;
    channel?: string;
    deliveryStatus?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ data: NotificationLog[]; total: number }> {
    const where: Prisma.NotificationLogWhereInput = {};

    if (filters.subscriberId) {
      where.subscriberId = filters.subscriberId;
    }

    if (filters.notificationType) {
      where.notificationType = filters.notificationType as any;
    }

    if (filters.channel) {
      where.channel = filters.channel as any;
    }

    if (filters.deliveryStatus) {
      where.deliveryStatus = filters.deliveryStatus as any;
    }

    const total = await this.prisma.notificationLog.count({ where });

    const data = await this.prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit,
      skip: filters.offset,
      include: {
        subscriber: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    return { data, total };
  }

  /**
   * Find notification by ID
   */
  async findById(id: string): Promise<NotificationLog | null> {
    return this.prisma.notificationLog.findUnique({
      where: { id },
      include: {
        subscriber: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });
  }

  /**
   * Update notification status
   */
  async updateStatus(
    id: string,
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED',
    errorMessage?: string
  ): Promise<NotificationLog> {
    const updateData: Prisma.NotificationLogUpdateInput = {
      deliveryStatus: status,
    };

    if (status === 'SENT') {
      updateData.sentAt = new Date();
    }

    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    return this.prisma.notificationLog.update({
      where: { id },
      data: updateData,
    });
  }
}
