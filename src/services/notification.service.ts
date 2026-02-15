import { NotificationLog, Prisma, Subscriber } from '@prisma/client';
import { NotificationRepository } from '../repositories/notification.repository';
import { EmailService } from './email.service';
import { SMSService } from './sms.service';
import { AppError } from '../utils/AppError';

/**
 * Notification Service
 * Business logic for sending notifications and tracking delivery
 */
export class NotificationService {
  private emailService: EmailService;
  private smsService: SMSService;

  constructor(private notificationRepository: NotificationRepository) {
    this.emailService = new EmailService();
    this.smsService = new SMSService();
  }

  /**
   * Send email notification
   */
  async sendEmail(data: {
    to: string;
    subject: string;
    message: string;
    subscriberId?: string;
    notificationType: 'PAYMENT_REMINDER' | 'EVENT_NOTIFICATION' | 'GENERAL';
  }): Promise<NotificationLog> {
    // Create notification log
    const logData: Prisma.NotificationLogCreateInput = {
      recipientEmail: data.to,
      notificationType: data.notificationType,
      channel: 'EMAIL',
      subject: data.subject,
      message: data.message,
      deliveryStatus: 'PENDING',
    };

    if (data.subscriberId) {
      logData.subscriber = {
        connect: { id: data.subscriberId },
      };
    }

    const log = await this.notificationRepository.create(logData);

    // Send email
    try {
      const result = await this.emailService.send({
        to: data.to,
        subject: data.subject,
        html: data.message,
      });

      if (result.success) {
        await this.notificationRepository.updateStatus(log.id, 'SENT');
        return this.notificationRepository.updateStatus(log.id, 'DELIVERED');
      } else {
        return this.notificationRepository.updateStatus(log.id, 'FAILED', result.error);
      }
    } catch (error: any) {
      return this.notificationRepository.updateStatus(log.id, 'FAILED', error.message);
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(data: {
    to: string;
    message: string;
    subscriberId?: string;
    notificationType: 'PAYMENT_REMINDER' | 'EVENT_NOTIFICATION' | 'GENERAL';
  }): Promise<NotificationLog> {
    // Create notification log
    const logData: Prisma.NotificationLogCreateInput = {
      recipientPhone: data.to,
      notificationType: data.notificationType,
      channel: 'SMS',
      message: data.message,
      deliveryStatus: 'PENDING',
    };

    if (data.subscriberId) {
      logData.subscriber = {
        connect: { id: data.subscriberId },
      };
    }

    const log = await this.notificationRepository.create(logData);

    // Send SMS
    try {
      const result = await this.smsService.send({
        to: data.to,
        message: data.message,
      });

      if (result.success) {
        await this.notificationRepository.updateStatus(log.id, 'SENT');
        return this.notificationRepository.updateStatus(log.id, 'DELIVERED');
      } else {
        return this.notificationRepository.updateStatus(log.id, 'FAILED', result.error);
      }
    } catch (error: any) {
      return this.notificationRepository.updateStatus(log.id, 'FAILED', error.message);
    }
  }

  /**
   * Send payment reminder to subscriber
   */
  async sendPaymentReminder(subscriber: Subscriber): Promise<{
    email?: NotificationLog;
    sms?: NotificationLog;
  }> {
    const result: { email?: NotificationLog; sms?: NotificationLog } = {};

    // Send email if enabled
    if (subscriber.emailNotifications && subscriber.email) {
      const emailResult = await this.emailService.sendPaymentReminder({
        to: subscriber.email,
        subscriberName: subscriber.fullName,
        amount: parseFloat(subscriber.monthlyDonationAmount.toString()),
        paymentDay: subscriber.paymentDayOfMonth,
      });

      // Log email notification
      const emailLog = await this.notificationRepository.create({
        subscriber: { connect: { id: subscriber.id } },
        recipientEmail: subscriber.email,
        notificationType: 'PAYMENT_REMINDER',
        channel: 'EMAIL',
        subject: 'Monthly Donation Reminder - Dare2Care',
        message: `Payment reminder for $${subscriber.monthlyDonationAmount}`,
        deliveryStatus: emailResult.success ? 'SENT' : 'FAILED',
        externalId: emailResult.id,
        errorMessage: emailResult.error,
        sentAt: emailResult.success ? new Date() : undefined,
      });

      if (emailResult.success) {
        result.email = await this.notificationRepository.updateStatus(emailLog.id, 'DELIVERED');
      } else {
        result.email = emailLog;
      }
    }

    // Send SMS if enabled
    if (subscriber.smsNotifications && subscriber.phoneNumber) {
      const smsResult = await this.smsService.sendPaymentReminder({
        to: subscriber.phoneNumber,
        subscriberName: subscriber.fullName,
        amount: parseFloat(subscriber.monthlyDonationAmount.toString()),
        paymentDay: subscriber.paymentDayOfMonth,
      });

      // Log SMS notification
      const smsLog = await this.notificationRepository.create({
        subscriber: { connect: { id: subscriber.id } },
        recipientPhone: subscriber.phoneNumber,
        notificationType: 'PAYMENT_REMINDER',
        channel: 'SMS',
        message: `Payment reminder for $${subscriber.monthlyDonationAmount}`,
        deliveryStatus: smsResult.success ? 'SENT' : 'FAILED',
        externalId: smsResult.id,
        errorMessage: smsResult.error,
        sentAt: smsResult.success ? new Date() : undefined,
      });

      if (smsResult.success) {
        result.sms = await this.notificationRepository.updateStatus(smsLog.id, 'DELIVERED');
      } else {
        result.sms = smsLog;
      }
    }

    return result;
  }

  /**
   * Get notification logs
   */
  async getNotificationLogs(filters: {
    subscriberId?: string;
    notificationType?: string;
    channel?: string;
    deliveryStatus?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: NotificationLog[]; total: number; page: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const result = await this.notificationRepository.findAll({
      subscriberId: filters.subscriberId,
      notificationType: filters.notificationType,
      channel: filters.channel,
      deliveryStatus: filters.deliveryStatus,
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
   * Get notification log by ID
   */
  async getNotificationById(id: string): Promise<NotificationLog> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) {
      throw new AppError('Notification log not found', 404);
    }
    return notification;
  }
}
