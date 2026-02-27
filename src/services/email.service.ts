/**
 * Email Service
 * Handles email sending via Resend
 *
 * Setup Instructions:
 * 1. Add RESEND_API_KEY to .env
 * 2. Add FROM_EMAIL to .env (e.g., noreply@dare2care.org or Dare2Care <noreply@dare2care.org>)
 */

import { Resend } from 'resend';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private fromEmail: string;
  private isConfigured: boolean;
  private resend: Resend | null;

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@dare2care.org';
    this.isConfigured = !!process.env.RESEND_API_KEY;
    this.resend = this.isConfigured
      ? new Resend(process.env.RESEND_API_KEY)
      : null;
  }

  /**
   * Send email
   */
  async send(options: EmailOptions): Promise<{ id: string; success: boolean; error?: string }> {
    try {
      // Fallback to console logging if Resend is not configured
      if (!this.isConfigured || !this.resend) {
        console.warn('[EmailService] Not configured (RESEND_API_KEY missing). Email would be sent to:', options.to);
        console.warn('[EmailService] Subject:', options.subject);

        return {
          id: `mock-${Date.now()}`,
          success: true,
        };
      }

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        console.error('[EmailService] Resend API error:', error);
        return {
          id: '',
          success: false,
          error: error.message || 'Resend API error',
        };
      }

      console.log('[EmailService] Email sent successfully:', {
        id: data?.id,
        to: options.to,
        subject: options.subject,
      });

      return {
        id: data?.id || '',
        success: true,
      };
    } catch (error: any) {
      console.error('[EmailService] Send error:', error);
      return {
        id: '',
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Send payment reminder email
   */
  async sendPaymentReminder(data: {
    to: string;
    subscriberName: string;
    amount: number;
    paymentDay: number;
  }): Promise<{ id: string; success: boolean; error?: string }> {
    const html = this.getPaymentReminderTemplate(data);
    const text = this.getPaymentReminderText(data);

    return this.send({
      to: data.to,
      subject: 'Monthly Donation Reminder - Dare2Care',
      html,
      text,
    });
  }

  /**
   * Send contact form notification to admin
   */
  async sendContactNotification(data: {
    adminEmail: string;
    contactName: string;
    contactEmail: string;
    subject: string;
    message: string;
  }): Promise<{ id: string; success: boolean; error?: string }> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Contact Form Submission</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 5px;">
          <p><strong>Name:</strong> ${data.contactName}</p>
          <p><strong>Email:</strong> ${data.contactEmail}</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${data.message}</p>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          This is an automated notification from the Dare2Care website contact form.
        </p>
      </div>
    `;

    return this.send({
      to: data.adminEmail,
      subject: `New Contact Form: ${data.subject}`,
      html,
    });
  }

  /**
   * Payment reminder email template
   */
  private getPaymentReminderTemplate(data: {
    subscriberName: string;
    amount: number;
    paymentDay: number;
  }): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Dare2Care</h1>
        </div>

        <div style="padding: 30px; background: #ffffff;">
          <h2 style="color: #333; margin-top: 0;">Monthly Donation Reminder</h2>

          <p>Dear ${data.subscriberName},</p>

          <p>This is a friendly reminder that your monthly donation of <strong>$${data.amount.toFixed(2)}</strong> is due on the <strong>${this.getOrdinalDay(data.paymentDay)}</strong> of this month.</p>

          <p>Your generous support helps us continue our mission to provide quality education and care to children in need.</p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Donation Amount:</strong> $${data.amount.toFixed(2)}</p>
            <p style="margin: 10px 0 0 0;"><strong>Payment Date:</strong> ${this.getOrdinalDay(data.paymentDay)} of each month</p>
          </div>

          <p>Thank you for your continued support and commitment to making a difference!</p>

          <p style="margin-top: 30px;">
            With gratitude,<br>
            <strong>The Dare2Care Team</strong>
          </p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;">
            If you have any questions or need to update your donation details, please contact us.
          </p>
          <p style="margin: 10px 0 0 0;">
            &copy; ${new Date().getFullYear()} Dare2Care. All rights reserved.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Payment reminder plain text version
   */
  private getPaymentReminderText(data: {
    subscriberName: string;
    amount: number;
    paymentDay: number;
  }): string {
    return `
Dear ${data.subscriberName},

This is a friendly reminder that your monthly donation of $${data.amount.toFixed(2)} is due on the ${this.getOrdinalDay(data.paymentDay)} of this month.

Your generous support helps us continue our mission to provide quality education and care to children in need.

Donation Amount: $${data.amount.toFixed(2)}
Payment Date: ${this.getOrdinalDay(data.paymentDay)} of each month

Thank you for your continued support and commitment to making a difference!

With gratitude,
The Dare2Care Team

---
If you have any questions or need to update your donation details, please contact us.
© ${new Date().getFullYear()} Dare2Care. All rights reserved.
    `.trim();
  }

  /**
   * Convert day number to ordinal (1st, 2nd, 3rd, etc.)
   */
  private getOrdinalDay(day: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const value = day % 100;
    return day + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
  }
}
