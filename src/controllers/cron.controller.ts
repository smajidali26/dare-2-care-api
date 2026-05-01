import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

/**
 * Cron Controller
 * Handles scheduled tasks via HTTP endpoints
 */
export class CronController {
  constructor(
    private prisma: PrismaClient,
    private notificationService: NotificationService
  ) {}

  /**
   * GET /api/cron/payment-reminders
   * Send monthly payment reminders to all active subscribers
   * Protected by Vercel Cron authentication (Authorization: Bearer <CRON_SECRET>)
   */
  sendMonthlyReminders = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Verify Vercel Cron secret
    const authHeader = req.headers['authorization'];
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    if (authHeader !== expectedAuth) {
      throw new AppError('Unauthorized', 401);
    }

    // Cron runs daily; only remind subscribers whose preferred day matches today
    const dayOfMonth = new Date().getUTCDate();

    const subscribers = await this.prisma.subscriber.findMany({
      where: {
        isActive: true,
        isDeleted: false,
        paymentDayOfMonth: dayOfMonth,
      },
    });

    console.log(
      `[Cron] Payment reminders for day ${dayOfMonth}: ${subscribers.length} subscriber(s)`
    );

    const results = {
      total: subscribers.length,
      dayOfMonth,
      sent: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[],
    };

    // Send reminders
    for (const subscriber of subscribers) {
      try {
        // Check if subscriber has any notification enabled
        if (!subscriber.emailNotifications && !subscriber.smsNotifications) {
          results.skipped++;
          results.details.push({
            subscriberId: subscriber.id,
            subscriberName: subscriber.fullName,
            status: 'skipped',
            reason: 'No notification preferences enabled',
          });
          continue;
        }

        // Send payment reminder
        const result = await this.notificationService.sendPaymentReminder(subscriber);

        const emailSent = result.email?.deliveryStatus === 'DELIVERED';
        const smsSent = result.sms?.deliveryStatus === 'DELIVERED';

        if (emailSent || smsSent) {
          results.sent++;
          results.details.push({
            subscriberId: subscriber.id,
            subscriberName: subscriber.fullName,
            status: 'sent',
            email: emailSent ? 'sent' : 'not_enabled',
            sms: smsSent ? 'sent' : 'not_enabled',
          });
        } else {
          results.failed++;
          results.details.push({
            subscriberId: subscriber.id,
            subscriberName: subscriber.fullName,
            status: 'failed',
            emailError: result.email?.errorMessage,
            smsError: result.sms?.errorMessage,
          });
        }
      } catch (error: any) {
        results.failed++;
        results.details.push({
          subscriberId: subscriber.id,
          subscriberName: subscriber.fullName,
          status: 'error',
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: 'Payment reminders processed',
      data: results,
    });
  });

  /**
   * GET /api/cron/health
   * Health check for cron jobs
   * Protected by Vercel Cron authentication (Authorization: Bearer <CRON_SECRET>)
   */
  healthCheck = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Verify Vercel Cron secret
    const authHeader = req.headers['authorization'];
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    if (authHeader !== expectedAuth) {
      throw new AppError('Unauthorized', 401);
    }

    res.json({
      success: true,
      message: 'Cron service is healthy',
      timestamp: new Date().toISOString(),
    });
  });
}
