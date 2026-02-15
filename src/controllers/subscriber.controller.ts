import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import * as subscriberService from '../services/subscriber.service';
import { getParamAsString } from '../utils/params.util';
import {
  createSubscriberSchema,
  updateSubscriberSchema,
  subscriberQuerySchema,
} from '../validators/subscriber.validator';
import { ApiError } from '../middleware/errorHandler.middleware';
import { ZodError } from 'zod';

/**
 * Subscriber Controller
 * Handles subscriber management HTTP requests
 */

/**
 * Get all subscribers
 * GET /api/admin/subscribers
 */
export const getAllSubscribers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate query params
    const query = subscriberQuerySchema.parse(req.query);

    // Build filters
    const filters: any = {};
    if (query.isActive !== undefined) filters.isActive = query.isActive;
    if (query.isManagement !== undefined) filters.isManagement = query.isManagement;
    if (query.paymentDayOfMonth) filters.paymentDayOfMonth = query.paymentDayOfMonth;
    if (query.subscriberType) filters.subscriberType = query.subscriberType;
    if (query.paymentType) filters.paymentType = query.paymentType;

    // Get subscribers
    const result = await subscriberService.getAllSubscribers(
      query.search,
      filters,
      { page: query.page, limit: query.limit }
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
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ApiError(400, error.errors[0].message));
    } else {
      next(error);
    }
  }
};

/**
 * Get subscriber by ID
 * GET /api/admin/subscribers/:id
 */
export const getSubscriberById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamAsString(req.params.id);

    const subscriber = await subscriberService.findById(id);

    if (!subscriber) {
      throw new ApiError(404, 'Subscriber not found');
    }

    res.status(200).json({
      success: true,
      data: subscriber,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new subscriber
 * POST /api/admin/subscribers
 */
export const createSubscriber = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const validatedData = createSubscriberSchema.parse(req.body);

    // Convert date strings to Date objects if needed
    const subscriberData: any = { ...validatedData };
    if (validatedData.subscriptionStartDate) {
      subscriberData.subscriptionStartDate = new Date(validatedData.subscriptionStartDate);
    }
    if (validatedData.subscriptionEndDate) {
      subscriberData.subscriptionEndDate = new Date(validatedData.subscriptionEndDate);
    }

    // Create subscriber
    const subscriber = await subscriberService.createSubscriber(subscriberData);

    res.status(201).json({
      success: true,
      data: subscriber,
      message: 'Subscriber created successfully',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ApiError(400, error.errors[0].message));
    } else if (error instanceof Error && error.message === 'Email already exists') {
      next(new ApiError(409, error.message));
    } else {
      next(error);
    }
  }
};

/**
 * Update subscriber
 * PUT /api/admin/subscribers/:id
 */
export const updateSubscriber = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamAsString(req.params.id);

    // Validate request body
    const validatedData = updateSubscriberSchema.parse(req.body);

    // Convert date strings to Date objects if needed
    const subscriberData: any = { ...validatedData };
    if (validatedData.subscriptionStartDate) {
      subscriberData.subscriptionStartDate = new Date(validatedData.subscriptionStartDate);
    }
    if (validatedData.subscriptionEndDate) {
      subscriberData.subscriptionEndDate = new Date(validatedData.subscriptionEndDate);
    }

    // Update subscriber
    const subscriber = await subscriberService.updateSubscriber(id, subscriberData);

    res.status(200).json({
      success: true,
      data: subscriber,
      message: 'Subscriber updated successfully',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ApiError(400, error.errors[0].message));
    } else if (error instanceof Error) {
      if (error.message === 'Subscriber not found') {
        next(new ApiError(404, error.message));
      } else if (error.message === 'Email already exists') {
        next(new ApiError(409, error.message));
      } else {
        next(error);
      }
    } else {
      next(error);
    }
  }
};

/**
 * Delete subscriber (soft delete)
 * DELETE /api/admin/subscribers/:id
 */
export const deleteSubscriber = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamAsString(req.params.id);

    // Delete subscriber
    await subscriberService.deleteSubscriber(id);

    res.status(200).json({
      success: true,
      message: 'Subscriber deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Subscriber not found') {
      next(new ApiError(404, error.message));
    } else {
      next(error);
    }
  }
};

/**
 * Get management members (public endpoint)
 * GET /api/public/management
 */
export const getManagementMembers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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
  } catch (error) {
    next(error);
  }
};
