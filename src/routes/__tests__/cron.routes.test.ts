import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../middleware/errorHandler.middleware';

/**
 * DARE2CARE-17 [CRITICAL] — fail closed when CRON_SECRET is missing.
 *
 * The env module is mocked as a plain mutable object (not the real, frozen
 * `env` export) so each test can flip CRON_SECRET between "unset" and "set"
 * without needing to reload modules between tests. `requireCronSecret`
 * reads `env.CRON_SECRET` fresh on every request, so mutating this object
 * between tests is enough.
 *
 * `config/database.config` is mocked so the payment-reminders 200 case never
 * touches a real database — only `prisma.subscriber.findMany` and
 * `prisma.donation.groupBy` (used by DonationRepository.findPaidDonorIdsForPeriod,
 * DARE2CARE-13's suppression query) are exercised.
 */
const mockEnv = vi.hoisted<{ CRON_SECRET?: string }>(() => ({}));

vi.mock('../../config/env.config', () => ({ env: mockEnv }));

vi.mock('../../config/database.config', () => ({
  default: {
    subscriber: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    donation: {
      groupBy: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Import after the mocks above so cron.routes.ts (and its dependencies)
// resolve to the mocked modules.
import cronRoutes from '../cron.routes';

function buildTestApp() {
  const app = express();
  app.use('/api/cron', cronRoutes);
  app.use(errorHandler);
  return app;
}

describe('Cron routes — CRON_SECRET authorisation', () => {
  const app = buildTestApp();

  beforeEach(() => {
    delete mockEnv.CRON_SECRET;
  });

  describe('GET /api/cron/health', () => {
    it('returns 401 when CRON_SECRET is unset and the header is the literal "Bearer undefined"', async () => {
      const res = await request(app)
        .get('/api/cron/health')
        .set('Authorization', 'Bearer undefined');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ success: false, error: expect.objectContaining({ message: 'Unauthorized' }) });
    });

    it('returns 401 when CRON_SECRET is unset and no Authorization header is sent', async () => {
      const res = await request(app).get('/api/cron/health');

      expect(res.status).toBe(401);
    });

    it('returns 200 when CRON_SECRET is set and the header matches', async () => {
      mockEnv.CRON_SECRET = 'super-secret-cron-value';

      const res = await request(app)
        .get('/api/cron/health')
        .set('Authorization', 'Bearer super-secret-cron-value');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({ success: true, message: 'Cron service is healthy' })
      );
    });

    it('returns 401 when CRON_SECRET is set but the header is wrong', async () => {
      mockEnv.CRON_SECRET = 'super-secret-cron-value';

      const res = await request(app)
        .get('/api/cron/health')
        .set('Authorization', 'Bearer wrong-value');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/cron/payment-reminders', () => {
    it('returns 401 when CRON_SECRET is unset and the header is the literal "Bearer undefined"', async () => {
      const res = await request(app)
        .get('/api/cron/payment-reminders')
        .set('Authorization', 'Bearer undefined');

      expect(res.status).toBe(401);
    });

    it('returns 401 when CRON_SECRET is unset and no Authorization header is sent', async () => {
      const res = await request(app).get('/api/cron/payment-reminders');

      expect(res.status).toBe(401);
    });

    it('returns 200 when CRON_SECRET is set and the header matches', async () => {
      mockEnv.CRON_SECRET = 'super-secret-cron-value';

      const res = await request(app)
        .get('/api/cron/payment-reminders')
        .set('Authorization', 'Bearer super-secret-cron-value');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.objectContaining({ success: true }));
    });

    it('returns 401 when CRON_SECRET is set but the header is wrong', async () => {
      mockEnv.CRON_SECRET = 'super-secret-cron-value';

      const res = await request(app)
        .get('/api/cron/payment-reminders')
        .set('Authorization', 'Bearer wrong-value');

      expect(res.status).toBe(401);
    });
  });
});
