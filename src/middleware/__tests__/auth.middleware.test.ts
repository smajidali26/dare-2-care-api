import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../errorHandler.middleware';

/**
 * DARE2CARE-19 — authorise on the DB-loaded role, not the JWT claim.
 *
 * `verifyToken` and `userService.findById` are mocked so we can freely vary
 * "what the token claims" vs "what the DB row currently says" per test,
 * without a real JWT or a real database.
 */
const mockVerifyToken = vi.fn();
vi.mock('../../utils/jwt.util', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

const mockFindById = vi.fn();
vi.mock('../../services/user.service', () => ({
  findById: (...args: unknown[]) => mockFindById(...args),
}));

import { authenticateToken, requireRole } from '../auth.middleware';
import { AuthenticatedRequest } from '../../types/auth.types';

function buildTestApp() {
  const app = express();
  app.get(
    '/admin-only',
    authenticateToken,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res) => {
      res.status(200).json({ success: true, data: { user: req.user } });
    }
  );
  app.use(errorHandler);
  return app;
}

describe('authenticateToken + requireRole', () => {
  const app = buildTestApp();

  beforeEach(() => {
    mockVerifyToken.mockReset();
    mockFindById.mockReset();
  });

  it('blocks with 403 when the JWT claims ADMIN but the DB row says CONTENT_MANAGER', async () => {
    mockVerifyToken.mockReturnValue({ userId: 'user-1', email: 'stale@example.com', role: 'ADMIN' });
    mockFindById.mockResolvedValue({
      id: 'user-1',
      email: 'current@example.com',
      role: 'CONTENT_MANAGER',
      isActive: true,
    });

    const res = await request(app).get('/admin-only').set('Authorization', 'Bearer sometoken');

    expect(res.status).toBe(403);
  });

  it('allows access when the JWT claim and the DB role match', async () => {
    mockVerifyToken.mockReturnValue({ userId: 'user-1', email: 'a@example.com', role: 'ADMIN' });
    mockFindById.mockResolvedValue({
      id: 'user-1',
      email: 'a@example.com',
      role: 'ADMIN',
      isActive: true,
    });

    const res = await request(app).get('/admin-only').set('Authorization', 'Bearer sometoken');

    expect(res.status).toBe(200);
    expect(res.body.data.user).toEqual({ userId: 'user-1', email: 'a@example.com', role: 'ADMIN' });
  });

  it('authorises on the DB role even when the JWT claim is stale/lower-privileged', async () => {
    // Claim says CONTENT_MANAGER but the DB row has since been promoted to ADMIN —
    // the request should be authorised on the current (DB) role.
    mockVerifyToken.mockReturnValue({ userId: 'user-1', email: 'a@example.com', role: 'CONTENT_MANAGER' });
    mockFindById.mockResolvedValue({
      id: 'user-1',
      email: 'a@example.com',
      role: 'ADMIN',
      isActive: true,
    });

    const res = await request(app).get('/admin-only').set('Authorization', 'Bearer sometoken');

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('ADMIN');
  });

  it('returns 401 for an inactive user (existing behaviour preserved)', async () => {
    mockVerifyToken.mockReturnValue({ userId: 'user-1', email: 'a@example.com', role: 'ADMIN' });
    mockFindById.mockResolvedValue({
      id: 'user-1',
      email: 'a@example.com',
      role: 'ADMIN',
      isActive: false,
    });

    const res = await request(app).get('/admin-only').set('Authorization', 'Bearer sometoken');

    expect(res.status).toBe(401);
  });

  it('returns 401 when the user no longer exists', async () => {
    mockVerifyToken.mockReturnValue({ userId: 'user-1', email: 'a@example.com', role: 'ADMIN' });
    mockFindById.mockResolvedValue(null);

    const res = await request(app).get('/admin-only').set('Authorization', 'Bearer sometoken');

    expect(res.status).toBe(401);
  });
});
