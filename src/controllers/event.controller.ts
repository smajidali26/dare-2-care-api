import { Request, Response, NextFunction } from 'express';
import { EventService } from '../services/event.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamAsString } from '../utils/params.util';

/**
 * Event Controller
 * Handles HTTP requests for event management
 */
export class EventController {
  constructor(private eventService: EventService) {}

  /**
   * GET /api/admin/events
   * List all events with pagination and filters
   */
  list = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { search, isPublished, page, limit } = req.query;

    const result = await this.eventService.getAllEvents({
      search: search as string,
      isPublished: isPublished === 'true' ? true : isPublished === 'false' ? false : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    });

    res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: limit ? parseInt(limit as string, 10) : 10,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * GET /api/admin/events/:id
   * Get single event by ID
   */
  get = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    const event = await this.eventService.getEventById(id);

    res.json({
      success: true,
      data: event,
    });
  });

  /**
   * POST /api/admin/events
   * Create new event
   */
  create = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const event = await this.eventService.createEvent(req.body);

    res.status(201).json({
      success: true,
      data: event,
      message: 'Event created successfully',
    });
  });

  /**
   * PUT /api/admin/events/:id
   * Update event
   */
  update = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    const event = await this.eventService.updateEvent(id, req.body);

    res.json({
      success: true,
      data: event,
      message: 'Event updated successfully',
    });
  });

  /**
   * DELETE /api/admin/events/:id
   * Delete event (soft delete)
   */
  delete = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    await this.eventService.deleteEvent(id);

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  });

  /**
   * PUT /api/admin/events/:id/publish
   * Publish event
   */
  publish = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    const event = await this.eventService.publishEvent(id);

    res.json({
      success: true,
      data: event,
      message: 'Event published successfully',
    });
  });

  /**
   * PUT /api/admin/events/:id/unpublish
   * Unpublish event
   */
  unpublish = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    const event = await this.eventService.unpublishEvent(id);

    res.json({
      success: true,
      data: event,
      message: 'Event unpublished successfully',
    });
  });

  /**
   * GET /api/admin/events/:id/media
   * Get event media
   */
  getMedia = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    const media = await this.eventService.getEventMedia(id);

    res.json({
      success: true,
      data: media,
    });
  });

  /**
   * POST /api/admin/events/:id/media
   * Add media to event
   */
  addMedia = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    const media = await this.eventService.addEventMedia(id, req.body);

    res.status(201).json({
      success: true,
      data: media,
      message: 'Media added to event successfully',
    });
  });

  /**
   * DELETE /api/admin/events/:id/media/:mediaId
   * Delete event media
   */
  deleteMedia = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const mediaId = getParamAsString(req.params.mediaId);
    await this.eventService.deleteEventMedia(mediaId);

    res.json({
      success: true,
      message: 'Media deleted successfully',
    });
  });

  /**
   * PUT /api/admin/events/:id/media/:mediaId
   * Update media display order
   */
  updateMediaOrder = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const mediaId = getParamAsString(req.params.mediaId);
    const { displayOrder } = req.body;
    const media = await this.eventService.updateMediaOrder(mediaId, displayOrder);

    res.json({
      success: true,
      data: media,
      message: 'Media order updated successfully',
    });
  });

  /**
   * GET /api/public/events
   * List published events only (public endpoint)
   */
  listPublished = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { search, page, limit } = req.query;

    // Force isPublished to true for public endpoint
    const result = await this.eventService.getAllEvents({
      search: search as string,
      isPublished: true, // Always filter for published events only
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    });

    res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: limit ? parseInt(limit as string, 10) : 10,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * GET /api/public/events/:slug
   * Get published event by slug (public endpoint)
   */
  getBySlugPublic = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const slug = getParamAsString(req.params.slug);
    const event = await this.eventService.getPublishedEventBySlug(slug);

    res.json({
      success: true,
      data: event,
    });
  });
}
