import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { CronController } from '../cron.controller';
import { errorHandler } from '../../middleware/errorHandler.middleware';

/**
 * DARE2CARE-13 — suppress reminders for subscribers who already paid.
 *
 * `CronController` is constructed directly with mocked `prisma`,
 * `notificationService`, and `donationRepository` so each scenario can
 * control exactly which donor ids come back as "already paid" without a
 * real database. Requests go through a real Express app (via supertest)
 * rather than calling the handler function directly: `asyncHandler` does not
 * `return` its internal promise chain, so awaiting the handler's own return
 * value does not wait for it to finish — only driving it through an actual
 * request/response cycle does (matches the existing pattern in
 * `cron.routes.test.ts`).
 *
 * The suppression predicate itself (COMPLETED, not voided, not soft-deleted,
 * donor-linked, period-matched) lives in
 * `DonationRepository.findPaidDonorIdsForPeriod` and is exercised directly
 * against the Prisma query shape in `donation.repository.test.ts`; here we
 * verify the controller correctly excludes suppressed subscribers, still
 * reminds the rest, and reports an accurate `suppressed` count without
 * renaming any existing field.
 */
describe('CronController.sendMonthlyReminders — suppression', () => {
  const fixedNow = new Date('2026-08-17T12:00:00.000Z'); // UTC day 17, period 2026-08

  const subA = {
    id: 'sub-a',
    fullName: 'Already Paid',
    emailNotifications: true,
    smsNotifications: false,
    email: 'a@x.com',
    phoneNumber: '',
  };
  const subB = {
    id: 'sub-b',
    fullName: 'Still Owes',
    emailNotifications: true,
    smsNotifications: false,
    email: 'b@x.com',
    phoneNumber: '',
  };

  let prisma: any;
  let notificationService: any;
  let donationRepository: any;

  function buildApp(controller: CronController) {
    const app = express();
    app.get('/payment-reminders', controller.sendMonthlyReminders);
    app.use(errorHandler);
    return app;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    prisma = {
      subscriber: {
        findMany: vi.fn().mockResolvedValue([subA, subB]),
      },
    };
    notificationService = {
      sendPaymentReminder: vi.fn().mockResolvedValue({
        email: { deliveryStatus: 'DELIVERED' },
      }),
    };
    donationRepository = {
      findPaidDonorIdsForPeriod: vi.fn().mockResolvedValue(new Set(['sub-a'])),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('suppresses a subscriber with a completed donation for the current period and still reminds the rest', async () => {
    const controller = new CronController(prisma, notificationService, donationRepository);
    const res = await request(buildApp(controller)).get('/payment-reminders');

    expect(res.status).toBe(200);
    expect(donationRepository.findPaidDonorIdsForPeriod).toHaveBeenCalledWith('2026-08');
    expect(notificationService.sendPaymentReminder).toHaveBeenCalledTimes(1);
    expect(notificationService.sendPaymentReminder).toHaveBeenCalledWith(subB);

    const data = res.body.data;
    expect(data.total).toBe(2);
    expect(data.suppressed).toBe(1);
    expect(data.sent).toBe(1);
    expect(data.period).toBe('2026-08');
    expect(data.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ subscriberId: 'sub-a', status: 'suppressed' })])
    );
    // Existing fields are not renamed.
    expect(data).toHaveProperty('sent');
    expect(data).toHaveProperty('failed');
    expect(data).toHaveProperty('skipped');
  });

  it('reminds a subscriber with no qualifying donation at all', async () => {
    donationRepository.findPaidDonorIdsForPeriod.mockResolvedValue(new Set());
    const controller = new CronController(prisma, notificationService, donationRepository);

    const res = await request(buildApp(controller)).get('/payment-reminders');

    expect(notificationService.sendPaymentReminder).toHaveBeenCalledTimes(2);
    expect(res.body.data.suppressed).toBe(0);
    expect(res.body.data.sent).toBe(2);
  });

  it('reminds everyone when the repository finds no qualifying donation for the period (voided/PENDING/other-period/anonymous all excluded upstream)', async () => {
    donationRepository.findPaidDonorIdsForPeriod.mockResolvedValue(new Set());
    const controller = new CronController(prisma, notificationService, donationRepository);

    await request(buildApp(controller)).get('/payment-reminders');

    expect(notificationService.sendPaymentReminder).toHaveBeenCalledWith(subA);
    expect(notificationService.sendPaymentReminder).toHaveBeenCalledWith(subB);
  });

  it('queries donors for suppression exactly once (no N+1)', async () => {
    const controller = new CronController(prisma, notificationService, donationRepository);
    await request(buildApp(controller)).get('/payment-reminders');

    expect(donationRepository.findPaidDonorIdsForPeriod).toHaveBeenCalledTimes(1);
  });
});
