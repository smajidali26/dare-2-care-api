import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamAsString } from '../utils/params.util';

/**
 * Notification Controller
 * Handles HTTP requests for notification management (admin)
 */
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  /**
   * GET /api/admin/notifications
   * List all notification logs with pagination and filters
   */
  list = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { subscriberId, notificationType, channel, deliveryStatus, page, limit } = req.query;

    const result = await this.notificationService.getNotificationLogs({
      subscriberId: subscriberId as string,
      notificationType: notificationType as string,
      channel: channel as string,
      deliveryStatus: deliveryStatus as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: limit ? parseInt(limit as string, 10) : 20,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * GET /api/admin/notifications/:id
   * Get single notification log by ID
   */
  get = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    const notification = await this.notificationService.getNotificationById(id);

    res.json({
      success: true,
      data: notification,
    });
  });

  /**
   * POST /api/admin/notifications/send
   * Broadcast a notification to filtered subscribers.
   */
  send = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const result = await this.notificationService.broadcast(req.body);

    res.json({
      success: true,
      message: 'Broadcast complete',
      data: result,
    });
  });
}
