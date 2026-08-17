import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

/**
 * DARE2CARE-22 — helmet security headers.
 *
 * Mocks the Prisma singleton so GET /api/health never touches a real
 * database (same pattern as routes/__tests__/health.test.ts). Asserts the
 * headers helmet() adds to every response, and confirms X-Powered-By is
 * removed.
 */
vi.mock('../config/database.config', () => ({
  default: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));

import app from '../app';

describe('Security headers (helmet) — GET /api/health', () => {
  it('sets X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets a frame-denying header (X-Frame-Options: SAMEORIGIN)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('sets Strict-Transport-Security', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['strict-transport-security']).toContain('max-age=');
  });

  it('sets Referrer-Policy: no-referrer', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
  });

  it('removes the X-Powered-By header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('does NOT set a Content-Security-Policy header (deferred to a separate ticket)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toBeUndefined();
  });
});
