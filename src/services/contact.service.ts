import { ContactSubmission, Prisma } from '@prisma/client';
import { ContactRepository } from '../repositories/contact.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { EmailService } from './email.service';
import { AppError } from '../utils/AppError';

/**
 * Contact Service
 * Business logic for contact form submissions
 */
export class ContactService {
  private emailService: EmailService;

  constructor(
    private contactRepository: ContactRepository,
    private notificationRepository: NotificationRepository
  ) {
    this.emailService = new EmailService();
  }

  /**
   * Submit contact form.
   * Persists the submission, then attempts to notify the admin by email.
   * The submission must succeed even if the notification step fails.
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

    const submission = await this.contactRepository.create(contactData);

    // Notify admin — best-effort, must not block submission
    try {
      await this.notifyAdmin(submission);
    } catch (err: any) {
      console.error('[ContactService] Admin notification failed:', err?.message || err);
    }

    return submission;
  }

  private async notifyAdmin(submission: ContactSubmission): Promise<void> {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

    if (!adminEmail) {
      const error = 'ADMIN_NOTIFICATION_EMAIL env var not set';
      console.warn(`[ContactService] ${error}; admin will not receive contact-form alerts`);
      await this.notificationRepository.create({
        notificationType: 'GENERAL',
        channel: 'EMAIL',
        subject: `Contact form submission: ${submission.subject}`,
        message: `From ${submission.fullName} <${submission.email}>: ${submission.message}`,
        deliveryStatus: 'FAILED',
        errorMessage: error,
      });
      return;
    }

    const result = await this.emailService.sendContactNotification({
      adminEmail,
      contactName: submission.fullName,
      contactEmail: submission.email,
      subject: submission.subject,
      message: submission.message,
    });

    await this.notificationRepository.create({
      recipientEmail: adminEmail,
      notificationType: 'GENERAL',
      channel: 'EMAIL',
      subject: `Contact form submission: ${submission.subject}`,
      message: `From ${submission.fullName} <${submission.email}>: ${submission.message}`,
      deliveryStatus: result.success ? 'DELIVERED' : 'FAILED',
      externalId: result.id || undefined,
      errorMessage: result.error,
      sentAt: result.success ? new Date() : undefined,
    });
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
