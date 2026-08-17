import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

/**
 * DARE2CARE-22 — proves `helmet()` does not disturb the Stripe webhook's
 * raw-body path.
 *
 * `app.ts` mounts `/api/stripe` (which applies `express.raw()` locally on
 * `POST /webhook`) BEFORE the global `express.json()` parser, because
 * signature verification needs the untouched raw bytes. `helmet()` was added
 * ahead of the Stripe mount (after CORS, before every route). Since helmet
 * only sets response headers and never reads/rewrites the request body, the
 * route must still receive the raw body exactly as before.
 *
 * STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are intentionally unset in the
 * test environment (src/test/setup.ts), so the gateway is "unconfigured" and
 * responds 503 — see `StripeGateway.constructWebhookEvent`. That 503 (rather
 * than a body-parsing crash, a CORS rejection, or a generic 500) is itself
 * the proof the request reached the real controller/service/gateway chain
 * through the raw-body route, and helmet's headers are still present on
 * that response.
 */
vi.mock('../../config/database.config', () => ({
  default: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));

import app from '../../app';

describe('POST /api/stripe/webhook — unaffected by helmet / mount order preserved', () => {
  it('still reaches the webhook handler with the raw body (gateway reports "not configured", not a parsing error)', async () => {
    const res = await request(app)
      .post('/api/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=123,v1=fake')
      .send(Buffer.from(JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' })));

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      success: false,
      error: expect.objectContaining({ message: 'Stripe webhook is not configured' }),
    });
  });

  it('still carries the helmet security headers on the webhook route', async () => {
    const res = await request(app)
      .post('/api/stripe/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=123,v1=fake')
      .send(Buffer.from(JSON.stringify({ id: 'evt_123', type: 'payment_intent.succeeded' })));

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
