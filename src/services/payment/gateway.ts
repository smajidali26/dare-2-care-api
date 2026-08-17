/**
 * Payment gateway abstraction.
 *
 * Keeps the donation flow provider-agnostic. StripeGateway is the current
 * implementation; a local gateway (e.g. Safepay / JazzCash / Easypaisa) can be
 * swapped in later without touching the donation domain.
 */
export interface CreatePaymentIntentParams {
  amountMinor: number; // smallest currency unit (paisa for PKR)
  currency: string;
  metadata?: Record<string, string>;
  description?: string;
}

export interface CreatePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
}

export interface GatewayWebhookEvent {
  type: string;
  paymentIntentId?: string;
  chargeId?: string;
}

export interface RefundParams {
  paymentIntentId: string;
}

export interface RefundResult {
  refundId: string;
}

export interface PaymentGateway {
  readonly isConfigured: boolean;
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<CreatePaymentIntentResult>;
  constructWebhookEvent(rawBody: Buffer, signature: string): GatewayWebhookEvent;
  /**
   * Refund a captured payment at the gateway. Must be attempted for every
   * Stripe-method donation refund — a ledger-only refund would let the books
   * diverge from what Stripe actually holds (DARE2CARE-9 §2.2).
   */
  refund(params: RefundParams): Promise<RefundResult>;
}
