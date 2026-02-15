import { ContactSubmission, Prisma } from '@prisma/client';
import { ContactRepository } from '../repositories/contact.repository';
import { AppError } from '../utils/AppError';

/**
 * Contact Service
 * Business logic for contact form submissions
 */
export class ContactService {
  constructor(private contactRepository: ContactRepository) {}

  /**
   * Submit contact form
   */
  async submitContact(data: {
    fullName: string;
    email: string;
    phoneNumber?: string;
    subject: string;
    message: string;
  }): Promise<ContactSubmission> {
    const contactData: Prisma.ContactSubmissionCreateInput = {
      fullName: data.fullName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      subject: data.subject,
      message: data.message,
    };

    return this.contactRepository.create(contactData);
  }

  /**
   * Get all contact submissions (admin)
   */
  async getAllSubmissions(filters: {
    isRead?: boolean;
    isReplied?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: ContactSubmission[]; total: number; page: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const result = await this.contactRepository.findAll({
      isRead: filters.isRead,
      isReplied: filters.isReplied,
      limit,
      offset,
    });

    return {
      data: result.data,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  /**
   * Get contact submission by ID (admin)
   */
  async getSubmissionById(id: string): Promise<ContactSubmission> {
    const submission = await this.contactRepository.findById(id);
    if (!submission) {
      throw new AppError('Contact submission not found', 404);
    }

    // Mark as read when viewed
    if (!submission.isRead) {
      await this.contactRepository.markAsRead(id);
    }

    return submission;
  }

  /**
   * Mark submission as replied (admin)
   */
  async markAsReplied(id: string): Promise<ContactSubmission> {
    const submission = await this.contactRepository.findById(id);
    if (!submission) {
      throw new AppError('Contact submission not found', 404);
    }

    return this.contactRepository.markAsReplied(id);
  }
}
