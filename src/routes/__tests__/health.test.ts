import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

/**
 * Smoke test — DARE2CARE-26.
 *
 * Mocks the Prisma singleton so the health check never touches a real
 * database. `app.ts` wires up every route module (admin/public/cron) at
 * import time via manual DI, and they all resolve `config/database.config`
 * to this same mocked module.
 */
vi.mock('../../config/database.config', () => ({
  default: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));

import app from '../../app';

describe('GET /api/health', () => {
  it('returns 200 with a healthy payload when the DB check succeeds', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Server is running',
      data: expect.objectContaining({
        status: 'healthy',
        database: 'connected',
      }),
    });
  });
});
