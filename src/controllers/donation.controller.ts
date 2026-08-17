import { Request, Response } from 'express';
import { DonationService } from '../services/donation.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamAsString } from '../utils/params.util';
import { AuthenticatedRequest } from '../types/auth.types';

/**
 * Donation Controller
 * HTTP handlers for finance / donation management.
 */
export class DonationController {
  constructor(private donationService: DonationService) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const { search, donorId, status, paymentType, method, startDate, endDate, includeVoided, page, limit } =
      req.query;

    const result = await this.donationService.list({
      search: search as string | undefined,
      donorId: donorId as string | undefined,
      status: status as string | undefined,
      paymentType: paymentType as string | undefined,
      method: method as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      includeVoided: includeVoided === 'true',
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const id = getParamAsString(req.params.id);
    const includeVoided = req.query.includeVoided === 'true';
    const donation = await this.donationService.getById(id, includeVoided);
    res.json({ success: true, data: donation });
  });

  /**
   * GET /api/admin/subscribers/:id/donations
   * History for one supporter. Scoped list — rows omit `donor` (ADR-0004 #1).
   */
  listBySubscriber = asyncHandler(async (req: Request, res: Response) => {
    const subscriberId = getParamAsString(req.params.id);
    const includeVoided = req.query.includeVoided === 'true';
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await this.donationService.listBySubscriber(subscriberId, {
      includeVoided,
      page,
      limit,
    });

    res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * `status` and `currency` are intentionally NOT read from `req.body` here
   * (DARE2CARE-9 §2.4/§2.7) — only the fields the create schema actually
   * defines are forwarded to the service. `validate()` only checks the
   * shape of `req.body`, it does not strip unknown keys from it, so an
   * explicit whitelist (rather than `...req.body`) is what actually closes
   * the client-settable-status gap.
   */
  create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { amount, paymentType, method, donorId, donorName, donorEmail, note, periodMonth, reference, receivedAt } =
      req.body;

    const donation = await this.donationService.record({
      amount,
      paymentType,
      method,
      donorId,
      donorName,
      donorEmail,
      note,
      periodMonth,
      reference,
      receivedAt: receivedAt ? new Date(receivedAt) : undefined,
      recordedByUserId: req.user?.userId,
    });

    res.status(201).json({
      success: true,
      data: donation,
      message: 'Donation recorded successfully',
    });
  });

  refund = asyncHandler(async (req: Request, res: Response) => {
    const id = getParamAsString(req.params.id);
    const manual = req.body?.manual === true;
    const donation = await this.donationService.refund(id, { manual });
    res.json({ success: true, data: donation, message: 'Donation marked as refunded' });
  });

  /**
   * POST /api/admin/finance/donations/:id/void
   * Replaces the old DELETE route (§2.5). SUPER_ADMIN only, enforced at the
   * route. `voidedByUserId` always comes from the authenticated user, never
   * the request body.
   */
  void = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const id = getParamAsString(req.params.id);
    const donation = await this.donationService.voidDonation(id, {
      voidReason: req.body.voidReason,
      voidedByUserId: req.user?.userId,
    });
    res.json({ success: true, data: donation, message: 'Donation voided successfully' });
  });

  summary = asyncHandler(async (_req: Request, res: Response) => {
    const data = await this.donationService.summary();
    res.json({ success: true, data });
  });

  /**
   * POST /api/public/donations/intent
   * Create a payment intent for an online donation (returns clientSecret).
   */
  createIntent = asyncHandler(async (req: Request, res: Response) => {
    const { amount, paymentType, donorName, donorEmail, note } = req.body;
    const result = await this.donationService.createDonationIntent({
      amount,
      paymentType,
      donorName,
      donorEmail,
      note,
    });
    res.status(201).json({ success: true, data: result });
  });

  /**
   * POST /api/stripe/webhook
   * Verified Stripe webhook (raw body). Marks donations completed/failed.
   */
  webhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = (req.headers['stripe-signature'] as string) || '';
    const result = await this.donationService.handleStripeWebhook(req.body as Buffer, signature);
    res.json({ success: true, ...result });
  });
}
