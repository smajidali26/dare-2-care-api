import { NotificationLog, Prisma, Subscriber, PrismaClient } from '@prisma/client';
import { NotificationRepository } from '../repositories/notification.repository';
import { EmailService } from './email.service';
import { SMSService } from './sms.service';
import { AppError } from '../utils/AppError';
import prisma from '../config/database.config';

/**
 * Notification Service
 * Business logic for sending notifications and tracking delivery
 */
export class NotificationService {
  private emailService: EmailService;
  private smsService: SMSService;
  private prisma: PrismaClient;

  constructor(
    private notificationRepository: NotificationRepository,
    prismaClient: PrismaClient = prisma
  ) {
    this.emailService = new EmailService();
    this.smsService = new SMSService();
    this.prisma = prismaClient;
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

    // Send email — single status update on success or failure
    try {
      const result = await this.emailService.send({
        to: data.to,
        subject: data.subject,
        html: data.message,
      });

      return this.notificationRepository.updateStatus(
        log.id,
        result.success ? 'DELIVERED' : 'FAILED',
        result.success ? undefined : result.error
      );
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

    // Send SMS — single status update on success or failure
    try {
      const result = await this.smsService.send({
        to: data.to,
        message: data.message,
      });

      return this.notificationRepository.updateStatus(
        log.id,
        result.success ? 'DELIVERED' : 'FAILED',
        result.success ? undefined : result.error
      );
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

  /**
   * Broadcast a notification to a filtered set of subscribers.
   * Returns counts and per-recipient outcomes.
   */
  async broadcast(input: {
    channel: 'EMAIL' | 'SMS' | 'BOTH';
    subject?: string;
    message: string;
    subscriberType?: 'PERMANENT' | 'GENERAL' | 'SUPPORTER';
    paymentType?: 'DONATION' | 'ZAKAT' | 'MEMBER_FEE' | 'CHARITY';
  }): Promise<{
    requested: number;
    emailDelivered: number;
    emailFailed: number;
    smsDelivered: number;
    smsFailed: number;
    skipped: number;
  }> {
    if (!input.message || input.message.trim().length === 0) {
      throw new AppError('Message is required', 400);
    }
    if (input.channel === 'EMAIL' || input.channel === 'BOTH') {
      if (!input.subject || input.subject.trim().length === 0) {
        throw new AppError('Subject is required when channel includes EMAIL', 400);
      }
    }

    const where: Prisma.SubscriberWhereInput = { isActive: true, isDeleted: false };
    if (input.subscriberType) where.subscriberType = input.subscriberType;
    if (input.paymentType) where.paymentType = input.paymentType;

    const subscribers = await this.prisma.subscriber.findMany({ where });

    const totals = {
      requested: subscribers.length,
      emailDelivered: 0,
      emailFailed: 0,
      smsDelivered: 0,
      smsFailed: 0,
      skipped: 0,
    };

    for (const s of subscribers) {
      const wantEmail =
        (input.channel === 'EMAIL' || input.channel === 'BOTH') &&
        s.emailNotifications &&
        s.email;
      const wantSms =
        (input.channel === 'SMS' || input.channel === 'BOTH') &&
        s.smsNotifications &&
        s.phoneNumber;

      if (!wantEmail && !wantSms) {
        totals.skipped++;
        continue;
      }

      // Wrap each per-recipient send so a transient failure on one doesn't abort the broadcast.
      if (wantEmail) {
        try {
          const log = await this.sendEmail({
            to: s.email,
            subject: input.subject!,
            message: input.message,
            subscriberId: s.id,
            notificationType: 'GENERAL',
          });
          if (log.deliveryStatus === 'DELIVERED') totals.emailDelivered++;
          else totals.emailFailed++;
        } catch (err: any) {
          console.error(`[broadcast] email send failed for subscriber ${s.id}:`, err?.message || err);
          totals.emailFailed++;
        }
      }

      if (wantSms) {
        try {
          const log = await this.sendSMS({
            to: s.phoneNumber,
            message: input.message,
            subscriberId: s.id,
            notificationType: 'GENERAL',
          });
          if (log.deliveryStatus === 'DELIVERED') totals.smsDelivered++;
          else totals.smsFailed++;
        } catch (err: any) {
          console.error(`[broadcast] sms send failed for subscriber ${s.id}:`, err?.message || err);
          totals.smsFailed++;
        }
      }
    }

    return totals;
  }
}
