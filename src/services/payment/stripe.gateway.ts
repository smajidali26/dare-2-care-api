import Stripe from 'stripe';
import {
  PaymentGateway,
  CreatePaymentIntentParams,
  CreatePaymentIntentResult,
  GatewayWebhookEvent,
} from './gateway';
import { AppError } from '../../utils/AppError';

/**
 * Stripe implementation of PaymentGateway.
 *
 * Degrades gracefully: when STRIPE_SECRET_KEY is unset the gateway is marked
 * unconfigured and payment operations return a clear 503 instead of crashing,
 * so the API boots and runs fine without Stripe credentials.
 */
export class StripeGateway implements PaymentGateway {
  private stripe: InstanceType<typeof Stripe> | null;
  private webhookSecret: string | undefined;
  readonly isConfigured: boolean;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    this.isConfigured = !!apiKey;
    this.stripe = apiKey ? new Stripe(apiKey) : null;
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<CreatePaymentIntentResult> {
    if (!this.stripe) {
      throw new AppError('Online payments are not configured', 503);
    }

    const intent = await this.stripe.paymentIntents.create({
      amount: params.amountMinor,
      currency: params.currency,
      description: params.description,
      metadata: params.metadata,
      automatic_payment_methods: { enabled: true },
    });

    if (!intent.client_secret) {
      throw new AppError('Failed to create payment intent', 502);
    }

    return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): GatewayWebhookEvent {
    if (!this.stripe || !this.webhookSecret) {
      throw new AppError('Stripe webhook is not configured', 503);
    }
    if (!signature) {
      throw new AppError('Missing Stripe signature', 400);
    }

    let event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (err: any) {
      throw new AppError(`Webhook signature verification failed: ${err.message}`, 400);
    }

    const obj = event.data.object as { id?: string; latest_charge?: string | unknown };
    return {
      type: event.type,
      paymentIntentId: obj?.id,
      chargeId: typeof obj?.latest_charge === 'string' ? obj.latest_charge : undefined,
    };
  }
}
