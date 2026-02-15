/**
 * SMS Service
 * Handles SMS sending via Twilio
 *
 * Setup Instructions:
 * 1. Install Twilio: npm install twilio
 * 2. Add TWILIO_ACCOUNT_SID to .env
 * 3. Add TWILIO_AUTH_TOKEN to .env
 * 4. Add TWILIO_PHONE_NUMBER to .env (e.g., +1234567890)
 */

interface SMSOptions {
  to: string;
  message: string;
}

export class SMSService {
  private fromPhone: string;
  private isConfigured: boolean;

  constructor() {
    this.fromPhone = process.env.TWILIO_PHONE_NUMBER || '';
    this.isConfigured = !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    );
  }

  /**
   * Send SMS
   */
  async send(options: SMSOptions): Promise<{ id: string; success: boolean; error?: string }> {
    try {
      // Check if SMS service is configured
      if (!this.isConfigured) {
        console.warn('SMS service not configured. SMS would be sent to:', options.to);
        console.warn('Message:', options.message);

        return {
          id: `mock-sms-${Date.now()}`,
          success: true,
        };
      }

      // TODO: Implement Twilio integration
      // const twilio = require('twilio');
      // const client = twilio(
      //   process.env.TWILIO_ACCOUNT_SID,
      //   process.env.TWILIO_AUTH_TOKEN
      // );
      //
      // const result = await client.messages.create({
      //   body: options.message,
      //   from: this.fromPhone,
      //   to: options.to,
      // });
      //
      // return {
      //   id: result.sid,
      //   success: true,
      // };

      // Mock implementation for now
      console.log('SMS sent (mock):', {
        to: options.to,
        message: options.message,
      });

      return {
        id: `mock-sms-${Date.now()}`,
        success: true,
      };
    } catch (error: any) {
      console.error('SMS send error:', error);
      return {
        id: '',
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Send payment reminder SMS
   */
  async sendPaymentReminder(data: {
    to: string;
    subscriberName: string;
    amount: number;
    paymentDay: number;
  }): Promise<{ id: string; success: boolean; error?: string }> {
    const message = this.getPaymentReminderMessage(data);

    return this.send({
      to: data.to,
      message,
    });
  }

  /**
   * Payment reminder SMS template
   */
  private getPaymentReminderMessage(data: {
    subscriberName: string;
    amount: number;
    paymentDay: number;
  }): string {
    const ordinalDay = this.getOrdinalDay(data.paymentDay);
    return `Hi ${data.subscriberName}, this is a reminder that your monthly donation of $${data.amount.toFixed(2)} to Dare2Care is due on the ${ordinalDay} of this month. Thank you for your support!`;
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
