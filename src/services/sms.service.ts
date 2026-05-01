/**
 * SMS Service
 * Sends SMS via Twilio Messaging Service.
 *
 * Required env:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_MESSAGING_SERVICE_SID  (preferred) — or TWILIO_PHONE_NUMBER as fallback
 */

import twilio, { Twilio } from 'twilio';

interface SMSOptions {
  to: string;
  message: string;
}

export class SMSService {
  private client: Twilio | null;
  private messagingServiceSid: string | undefined;
  private fromPhone: string | undefined;
  private isConfigured: boolean;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    this.fromPhone = process.env.TWILIO_PHONE_NUMBER;

    this.isConfigured = !!(
      accountSid &&
      authToken &&
      (this.messagingServiceSid || this.fromPhone)
    );

    this.client = this.isConfigured ? twilio(accountSid, authToken) : null;
  }

  /**
   * Send SMS via Twilio. Returns success: false with diagnostic message on any failure.
   */
  async send(options: SMSOptions): Promise<{ id: string; success: boolean; error?: string }> {
    if (!this.isConfigured || !this.client) {
      const error = 'SMS service not configured — TWILIO_* env vars missing';
      console.warn(`[SMS] ${error} | to=${options.to}`);
      return { id: '', success: false, error };
    }

    try {
      const params: { body: string; to: string; messagingServiceSid?: string; from?: string } = {
        body: options.message,
        to: options.to,
      };
      if (this.messagingServiceSid) {
        params.messagingServiceSid = this.messagingServiceSid;
      } else if (this.fromPhone) {
        params.from = this.fromPhone;
      }

      const result = await this.client.messages.create(params);

      console.log(`[SMS] Sent | sid=${result.sid} | to=${options.to} | status=${result.status}`);

      return {
        id: result.sid,
        success: true,
      };
    } catch (err: any) {
      const error = err?.message || 'Twilio send failed';
      console.error(`[SMS] Send failed | to=${options.to} | code=${err?.code} | message=${error}`);
      return {
        id: '',
        success: false,
        error,
      };
    }
  }

  async sendPaymentReminder(data: {
    to: string;
    subscriberName: string;
    amount: number;
    paymentDay: number;
  }): Promise<{ id: string; success: boolean; error?: string }> {
    return this.send({
      to: data.to,
      message: this.getPaymentReminderMessage(data),
    });
  }

  private getPaymentReminderMessage(data: {
    subscriberName: string;
    amount: number;
    paymentDay: number;
  }): string {
    const ordinalDay = this.getOrdinalDay(data.paymentDay);
    return `Hi ${data.subscriberName}, this is a reminder that your monthly donation of $${data.amount.toFixed(2)} to Dare2Care is due on the ${ordinalDay} of this month. Thank you for your support!`;
  }

  private getOrdinalDay(day: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const value = day % 100;
    return day + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
  }
}
