import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { donationIntentRateLimiter } from '../rateLimit.middleware';

/**
 * DARE2CARE-9 §2.6 — the public donation-intent endpoint gets its own,
 * stricter (5/15min) rate limiter, distinct from the shared contact/general
 * limiters, so tuning one never accidentally tunes the other.
 */
describe('donationIntentRateLimiter', () => {
  function buildApp() {
    const app = express();
    app.post('/intent', donationIntentRateLimiter, (_req, res) => {
      res.status(201).json({ success: true });
    });
    return app;
  }

  it('allows up to 5 requests per window and rejects the 6th', async () => {
    const app = buildApp();

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/intent');
      expect(res.status).toBe(201);
    }

    const sixth = await request(app).post('/intent');
    expect(sixth.status).toBe(429);
    expect(sixth.body).toEqual(
      expect.objectContaining({ success: false, error: expect.objectContaining({ message: expect.any(String) }) })
    );
  });
});
