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
    const { search, donorId, status, paymentType, method, startDate, endDate, page, limit } = req.query;

    const result = await this.donationService.list({
      search: search as string | undefined,
      donorId: donorId as string | undefined,
      status: status as string | undefined,
      paymentType: paymentType as string | undefined,
      method: method as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
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
    const donation = await this.donationService.getById(id);
    res.json({ success: true, data: donation });
  });

  create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // receivedAt arrives as a string (validate() discards Zod transforms) — coerce here.
    const donation = await this.donationService.record({
      ...req.body,
      receivedAt: req.body.receivedAt ? new Date(req.body.receivedAt) : undefined,
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
    const donation = await this.donationService.refund(id);
    res.json({ success: true, data: donation, message: 'Donation marked as refunded' });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = getParamAsString(req.params.id);
    await this.donationService.remove(id);
    res.json({ success: true, message: 'Donation deleted successfully' });
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
