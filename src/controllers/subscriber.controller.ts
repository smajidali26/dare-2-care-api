import { Request, Response } from 'express';
import * as subscriberService from '../services/subscriber.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamAsString } from '../utils/params.util';
import { AppError } from '../utils/AppError';

/**
 * Subscriber Controller
 * Handles subscriber management HTTP requests
 */
export class SubscriberController {
  /**
   * GET /api/admin/subscribers
   * List all subscribers with pagination and filters
   */
  list = asyncHandler(async (req: Request, res: Response) => {
    const {
      search,
      page,
      limit,
      isActive,
      isManagement,
      paymentDayOfMonth,
      subscriberType,
      paymentType,
    } = req.query;

    // Build filters
    const filters: any = {};
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (isManagement !== undefined) filters.isManagement = isManagement === 'true';
    if (paymentDayOfMonth) filters.paymentDayOfMonth = Number(paymentDayOfMonth);
    if (subscriberType) filters.subscriberType = subscriberType;
    if (paymentType) filters.paymentType = paymentType;

    // Get subscribers
    const result = await subscriberService.getAllSubscribers(
      search as string | undefined,
      filters,
      { page: Number(page) || 1, limit: Number(limit) || 10 }
    );

    res.status(200).json({
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
   * GET /api/admin/subscribers/:id
   * Get single subscriber by ID
   */
  get = asyncHandler(async (req: Request, res: Response) => {
    const id = getParamAsString(req.params.id);
    const subscriber = await subscriberService.findById(id);

    if (!subscriber) {
      throw new AppError('Subscriber not found', 404);
    }

    res.status(200).json({
      success: true,
      data: subscriber,
    });
  });

  /**
   * POST /api/admin/subscribers
   * Create new subscriber
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    // Convert date strings to Date objects if needed
    const subscriberData: any = { ...req.body };
    if (req.body.subscriptionStartDate) {
      subscriberData.subscriptionStartDate = new Date(req.body.subscriptionStartDate);
    }
    if (req.body.subscriptionEndDate) {
      subscriberData.subscriptionEndDate = new Date(req.body.subscriptionEndDate);
    }

    const subscriber = await subscriberService.createSubscriber(subscriberData);

    res.status(201).json({
      success: true,
      data: subscriber,
      message: 'Subscriber created successfully',
    });
  });

  /**
   * PUT /api/admin/subscribers/:id
   * Update subscriber
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = getParamAsString(req.params.id);

    // Convert date strings to Date objects if needed
    const subscriberData: any = { ...req.body };
    if (req.body.subscriptionStartDate) {
      subscriberData.subscriptionStartDate = new Date(req.body.subscriptionStartDate);
    }
    if (req.body.subscriptionEndDate) {
      subscriberData.subscriptionEndDate = new Date(req.body.subscriptionEndDate);
    }

    const subscriber = await subscriberService.updateSubscriber(id, subscriberData);

    res.status(200).json({
      success: true,
      data: subscriber,
      message: 'Subscriber updated successfully',
    });
  });

  /**
   * DELETE /api/admin/subscribers/:id
   * Delete subscriber (soft delete)
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = getParamAsString(req.params.id);
    await subscriberService.deleteSubscriber(id);

    res.status(200).json({
      success: true,
      message: 'Subscriber deleted successfully',
    });
  });

  /**
   * GET /api/public/management
   * Get management members (public endpoint)
   */
  getManagementMembers = asyncHandler(async (req: Request, res: Response) => {
    const members = await subscriberService.getManagementMembers();

    // Remove sensitive subscriber data, only return management info
    const publicMembers = members.map(member => ({
      id: member.id,
      fullName: member.fullName,
      managementRole: member.managementRole,
      managementBio: member.managementBio,
      profileImageUrl: member.profileImageUrl,
      displayOrder: member.displayOrder,
    }));

    res.status(200).json({
      success: true,
      data: publicMembers,
    });
  });
}
