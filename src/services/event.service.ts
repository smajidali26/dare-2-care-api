import { Event, EventMedia, Prisma } from '@prisma/client';
import { EventRepository } from '../repositories/event.repository';
import { AppError } from '../utils/AppError';

/**
 * Event Service
 * Business logic for event management
 */
export class EventService {
  constructor(private eventRepository: EventRepository) {}

  /**
   * Generate URL-friendly slug from title
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .substring(0, 100); // Limit length
  }

  /**
   * Ensure slug is unique by appending number if necessary
   */
  async ensureUniqueSlug(slug: string, excludeId?: string): Promise<string> {
    let uniqueSlug = slug;
    let counter = 1;

    while (await this.eventRepository.slugExists(uniqueSlug, excludeId)) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  /**
   * Get all events with filters
   */
  async getAllEvents(filters: {
    search?: string;
    isPublished?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: Event[]; total: number; page: number; totalPages: number }> {
    const result = await this.eventRepository.findAll({
      search: filters.search,
      isPublished: filters.isPublished,
      page: filters.page,
      limit: filters.limit,
    });

    return {
      data: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    };
  }

  /**
   * Get event by ID
   */
  async getEventById(id: string): Promise<Event> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new AppError('Event not found', 404);
    }
    return event;
  }

  /**
   * Get event by slug (public)
   */
  async getEventBySlug(slug: string): Promise<Event> {
    const event = await this.eventRepository.findBySlug(slug);
    if (!event) {
      throw new AppError('Event not found', 404);
    }
    return event;
  }

  /**
   * Get published event by slug (public endpoint)
   * Only returns published events, returns 404 if event is unpublished
   */
  async getPublishedEventBySlug(slug: string): Promise<Event> {
    const event = await this.eventRepository.findBySlug(slug);
    if (!event || !event.isPublished) {
      throw new AppError('Event not found', 404);
    }
    return event;
  }

  /**
   * Create new event with auto-generated slug
   */
  async createEvent(data: {
    title: string;
    description: string;
    content: string;
    eventDate: Date;
    location: string;
    metaDescription?: string;
    isPublished?: boolean;
  }): Promise<Event> {
    // Generate and ensure unique slug
    const baseSlug = this.generateSlug(data.title);
    const uniqueSlug = await this.ensureUniqueSlug(baseSlug);

    const eventData: Prisma.EventCreateInput = {
      title: data.title,
      slug: uniqueSlug,
      description: data.description,
      content: data.content,
      eventDate: data.eventDate,
      location: data.location,
      metaDescription: data.metaDescription,
      isPublished: data.isPublished || false,
    };

    return this.eventRepository.create(eventData);
  }

  /**
   * Update event (regenerate slug if title changes)
   */
  async updateEvent(
    id: string,
    data: {
      title?: string;
      description?: string;
      content?: string;
      eventDate?: Date;
      location?: string;
      metaDescription?: string;
      isPublished?: boolean;
    }
  ): Promise<Event> {
    // Check if event exists
    await this.getEventById(id);

    const updateData: Prisma.EventUpdateInput = {};

    // If title changes, regenerate slug
    if (data.title) {
      updateData.title = data.title;
      const baseSlug = this.generateSlug(data.title);
      updateData.slug = await this.ensureUniqueSlug(baseSlug, id);
    }

    if (data.description !== undefined) updateData.description = data.description;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.eventDate !== undefined) updateData.eventDate = data.eventDate;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;

    return this.eventRepository.update(id, updateData);
  }

  /**
   * Delete event
   */
  async deleteEvent(id: string): Promise<void> {
    await this.getEventById(id);
    await this.eventRepository.softDelete(id);
  }

  /**
   * Publish event
   */
  async publishEvent(id: string): Promise<Event> {
    await this.getEventById(id);
    return this.eventRepository.publish(id);
  }

  /**
   * Unpublish event
   */
  async unpublishEvent(id: string): Promise<Event> {
    await this.getEventById(id);
    return this.eventRepository.unpublish(id);
  }

  /**
   * Add media to event
   */
  async addEventMedia(
    eventId: string,
    mediaData: {
      mediaType: 'IMAGE' | 'VIDEO';
      storageUrl: string;
      fileName: string;
      fileSize: number;
      caption?: string;
      displayOrder?: number;
    }
  ): Promise<EventMedia> {
    // Verify event exists
    await this.getEventById(eventId);

    return this.eventRepository.addMedia(eventId, {
      mediaType: mediaData.mediaType,
      storageUrl: mediaData.storageUrl,
      fileName: mediaData.fileName,
      fileSize: mediaData.fileSize,
      caption: mediaData.caption,
      displayOrder: mediaData.displayOrder || 0,
    });
  }

  /**
   * Delete event media
   */
  async deleteEventMedia(mediaId: string): Promise<void> {
    await this.eventRepository.deleteMedia(mediaId);
  }

  /**
   * Update media display order
   */
  async updateMediaOrder(mediaId: string, order: number): Promise<EventMedia> {
    return this.eventRepository.updateMediaOrder(mediaId, order);
  }

  /**
   * Get event media
   */
  async getEventMedia(eventId: string): Promise<EventMedia[]> {
    await this.getEventById(eventId);
    return this.eventRepository.getEventMedia(eventId);
  }
}
