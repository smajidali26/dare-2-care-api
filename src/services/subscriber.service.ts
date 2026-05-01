import subscriberRepository from '../repositories/subscriber.repository';
import { Subscriber, Prisma } from '@prisma/client';
import { PaginationOptions, FilterOptions } from '../repositories/base.repository';
import { AppError } from '../utils/AppError';

/**
 * Subscriber Service
 * Business logic for subscriber management
 */

/**
 * Find subscriber by email
 * @param email - Subscriber email
 * @returns Subscriber object or null if not found
 */
export const findByEmail = async (email: string): Promise<Subscriber | null> => {
  return subscriberRepository.findByEmail(email);
};

/**
 * Find subscriber by ID
 * @param id - Subscriber ID
 * @returns Subscriber object or null if not found
 */
export const findById = async (id: string): Promise<Subscriber | null> => {
  return subscriberRepository.findById(id);
};

/**
 * Get all subscribers with pagination and filters
 * @param searchTerm - Search term
 * @param filters - Filter options
 * @param pagination - Pagination options
 * @returns Paginated subscribers
 */
export const getAllSubscribers = async (
  searchTerm?: string,
  filters: FilterOptions = {},
  pagination: PaginationOptions = {}
) => {
  return subscriberRepository.search(searchTerm, filters, pagination);
};

/**
 * Create new subscriber
 * @param subscriberData - Subscriber data
 * @returns Created subscriber
 */
export const createSubscriber = async (subscriberData: {
  fullName: string;
  email: string;
  phoneNumber: string;
  monthlyDonationAmount: number;
  paymentDayOfMonth?: number;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  isActive?: boolean;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date | null;
  subscriberType: string;
  paymentType: string;
  profileImageUrl?: string | null;
  isManagement?: boolean;
  managementRole?: string | null;
  managementBio?: string | null;
  displayOrder?: number;
}): Promise<Subscriber> => {
  // Check if email already exists
  const existingSubscriber = await subscriberRepository.findByEmail(subscriberData.email);
  if (existingSubscriber) {
    throw new AppError('Email already exists', 409);
  }

  // Validate payment day
  const paymentDay = subscriberData.paymentDayOfMonth || 1;
  if (paymentDay < 1 || paymentDay > 28) {
    throw new AppError('Payment day must be between 1 and 28', 400);
  }

  // Create subscriber
  return subscriberRepository.create({
    fullName: subscriberData.fullName,
    email: subscriberData.email,
    phoneNumber: subscriberData.phoneNumber,
    monthlyDonationAmount: new Prisma.Decimal(subscriberData.monthlyDonationAmount),
    paymentDayOfMonth: paymentDay,
    emailNotifications: subscriberData.emailNotifications !== undefined ? subscriberData.emailNotifications : true,
    smsNotifications: subscriberData.smsNotifications !== undefined ? subscriberData.smsNotifications : true,
    isActive: subscriberData.isActive !== undefined ? subscriberData.isActive : true,
    subscriptionStartDate: subscriberData.subscriptionStartDate || new Date(),
    subscriptionEndDate: subscriberData.subscriptionEndDate,
    subscriberType: subscriberData.subscriberType as any,
    paymentType: subscriberData.paymentType as any,
    profileImageUrl: subscriberData.profileImageUrl || null,
    isManagement: subscriberData.isManagement || false,
    managementRole: subscriberData.managementRole || null,
    managementBio: subscriberData.managementBio || null,
    displayOrder: subscriberData.displayOrder || 0,
  });
};

/**
 * Update subscriber
 * @param id - Subscriber ID
 * @param subscriberData - Updated subscriber data
 * @returns Updated subscriber
 */
export const updateSubscriber = async (
  id: string,
  subscriberData: {
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    monthlyDonationAmount?: number;
    paymentDayOfMonth?: number;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    isActive?: boolean;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date | null;
    subscriberType?: string;
    paymentType?: string;
    profileImageUrl?: string | null;
    isManagement?: boolean;
    managementRole?: string | null;
    managementBio?: string | null;
    displayOrder?: number;
  }
): Promise<Subscriber> => {
  // Check if subscriber exists
  const existingSubscriber = await subscriberRepository.findById(id);
  if (!existingSubscriber) {
    throw new AppError('Subscriber not found', 404);
  }

  // If email is being updated, check for duplicates
  if (subscriberData.email && subscriberData.email !== existingSubscriber.email) {
    const emailExists = await subscriberRepository.emailExists(subscriberData.email, id);
    if (emailExists) {
      throw new AppError('Email already exists', 409);
    }
  }

  // Validate payment day if provided
  if (subscriberData.paymentDayOfMonth !== undefined) {
    if (subscriberData.paymentDayOfMonth < 1 || subscriberData.paymentDayOfMonth > 28) {
      throw new AppError('Payment day must be between 1 and 28', 400);
    }
  }

  // Convert monthlyDonationAmount to Decimal if provided
  const updateData: any = { ...subscriberData };
  if (subscriberData.monthlyDonationAmount !== undefined) {
    updateData.monthlyDonationAmount = new Prisma.Decimal(subscriberData.monthlyDonationAmount);
  }

  // Update subscriber
  return subscriberRepository.update(id, updateData);
};

/**
 * Delete subscriber (soft delete)
 * @param id - Subscriber ID
 * @returns Deleted subscriber
 */
export const deleteSubscriber = async (id: string): Promise<Subscriber> => {
  // Check if subscriber exists
  const existingSubscriber = await subscriberRepository.findById(id);
  if (!existingSubscriber) {
    throw new AppError('Subscriber not found', 404);
  }

  // Soft delete subscriber
  return subscriberRepository.softDelete(id);
};

/**
 * Get active subscribers
 * @param pagination - Pagination options
 * @returns Paginated active subscribers
 */
export const getActiveSubscribers = async (pagination: PaginationOptions = {}) => {
  return subscriberRepository.findActive(pagination);
};

/**
 * Get management members
 * @returns Array of management members
 */
export const getManagementMembers = async (): Promise<Subscriber[]> => {
  return subscriberRepository.findManagementMembers();
};

/**
 * Restore soft-deleted subscriber
 */
export const restoreSubscriber = async (id: string): Promise<Subscriber> => {
  const exists = await subscriberRepository.findByIdIncludingDeleted(id);
  if (!exists) {
    throw new AppError('Subscriber not found', 404);
  }
  return subscriberRepository.restore(id);
};
