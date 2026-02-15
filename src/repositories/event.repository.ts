import { PrismaClient, Event, EventMedia, Prisma } from '@prisma/client';
import { BaseRepository, PaginatedResult } from './base.repository';

/**
 * Event Repository
 * Handles database operations for events with media relations
 */
export class EventRepository extends BaseRepository<Event> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'event');
  }

  /**
   * Find all events with optional filters and pagination
   * Includes media relations ordered by displayOrder
   */
  async findAll(filters: {
    search?: string;
    isPublished?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResult<Event>> {
    const where: Prisma.EventWhereInput = {
      isDeleted: false,
    };

    // Search filter
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Published filter
    if (filters.isPublished !== undefined) {
      where.isPublished = filters.isPublished;
    }

    // Calculate pagination
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.prisma.event.count({ where });

    // Get paginated data with media
    const data = await this.prisma.event.findMany({
      where,
      include: {
        media: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { eventDate: 'desc' },
      take: limit,
      skip: skip,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Find event by ID with media relations
   */
  async findById(id: string): Promise<Event | null> {
    return this.prisma.event.findFirst({
      where: { id, isDeleted: false },
      include: {
        media: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Find event by slug for public access
   */
  async findBySlug(slug: string): Promise<Event | null> {
    return this.prisma.event.findFirst({
      where: {
        slug,
        isDeleted: false,
        isPublished: true,
      },
      include: {
        media: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Create new event
   */
  async create(data: Prisma.EventCreateInput | Partial<Event>): Promise<Event> {
    return this.prisma.event.create({
      data: data as Prisma.EventCreateInput,
      include: {
        media: true,
      },
    });
  }

  /**
   * Update event
   */
  async update(id: string, data: Prisma.EventUpdateInput): Promise<Event> {
    return this.prisma.event.update({
      where: { id },
      data,
      include: {
        media: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Soft delete event
   */
  async softDelete(id: string): Promise<Event> {
    return this.prisma.event.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /**
   * Add media to event
   */
  async addMedia(
    eventId: string,
    mediaData: Omit<Prisma.EventMediaCreateInput, 'event'>
  ): Promise<EventMedia> {
    return this.prisma.eventMedia.create({
      data: {
        ...mediaData,
        event: {
          connect: { id: eventId },
        },
      },
    });
  }

  /**
   * Delete event media
   */
  async deleteMedia(mediaId: string): Promise<EventMedia> {
    return this.prisma.eventMedia.delete({
      where: { id: mediaId },
    });
  }

  /**
   * Update media display order
   */
  async updateMediaOrder(mediaId: string, order: number): Promise<EventMedia> {
    return this.prisma.eventMedia.update({
      where: { id: mediaId },
      data: { displayOrder: order },
    });
  }

  /**
   * Get all media for an event
   */
  async getEventMedia(eventId: string): Promise<EventMedia[]> {
    return this.prisma.eventMedia.findMany({
      where: { eventId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Check if slug exists (excluding specific event ID)
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.EventWhereInput = {
      slug,
      isDeleted: false,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.event.count({ where });
    return count > 0;
  }

  /**
   * Publish event
   */
  async publish(id: string): Promise<Event> {
    return this.update(id, { isPublished: true });
  }

  /**
   * Unpublish event
   */
  async unpublish(id: string): Promise<Event> {
    return this.update(id, { isPublished: false });
  }
}
