import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../services/notification.service';
import { DonationRepository } from '../repositories/donation.repository';
import { asyncHandler } from '../utils/asyncHandler';
import { currentUtcPeriod } from '../utils/period.util';

/**
 * Cron Controller
 * Handles scheduled tasks via HTTP endpoints
 */
export class CronController {
  constructor(
    private prisma: PrismaClient,
    private notificationService: NotificationService,
    private donationRepository: DonationRepository
  ) {}

  /**
   * GET /api/cron/payment-reminders
   * Send monthly payment reminders to all active subscribers whose preferred
   * day matches today — UNLESS they already have a qualifying (COMPLETED,
   * non-voided, non-deleted, donor-linked, this-period) donation on record
   * (DARE2CARE-13). `PENDING` never suppresses: an abandoned Stripe checkout
   * must not silence a real reminder (spec §0/§4).
   * Protected by the `requireCronSecret` middleware (router.use in cron.routes.ts)
   */
  sendMonthlyReminders = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Cron runs daily; only remind subscribers whose preferred day matches today.
    // `now` is captured once so the day-of-month and the UTC period it's
    // matched against can never disagree at a month boundary.
    const now = new Date();
    const dayOfMonth = now.getUTCDate();
    const period = currentUtcPeriod(now);

    const candidates = await this.prisma.subscriber.findMany({
      where: {
        isActive: true,
        isDeleted: false,
        paymentDayOfMonth: dayOfMonth,
      },
    });

    // One query, not N+1: donor ids who already have a qualifying payment for this period.
    const paidDonorIds = await this.donationRepository.findPaidDonorIdsForPeriod(period);

    const suppressed = candidates.filter((s) => paidDonorIds.has(s.id));
    const subscribers = candidates.filter((s) => !paidDonorIds.has(s.id));

    console.log(
      `[Cron] Payment reminders for day ${dayOfMonth} (period ${period}): ` +
        `${candidates.length} candidate(s), ${suppressed.length} already paid, ${subscribers.length} to remind`
    );

    const results = {
      total: candidates.length,
      dayOfMonth,
      period,
      sent: 0,
      failed: 0,
      skipped: 0,
      suppressed: suppressed.length,
      details: [] as any[],
    };

    for (const subscriber of suppressed) {
      results.details.push({
        subscriberId: subscriber.id,
        subscriberName: subscriber.fullName,
        status: 'suppressed',
        reason: `Already paid for period ${period}`,
      });
    }

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
   * Protected by the `requireCronSecret` middleware (router.use in cron.routes.ts)
   */
  healthCheck = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    res.json({
      success: true,
      message: 'Cron service is healthy',
      timestamp: new Date().toISOString(),
    });
  });
}
