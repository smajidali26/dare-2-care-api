import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

/**
 * DARE2CARE-25 / ADR-0008 — requireRole coverage across admin.routes.ts.
 *
 * Mounts the real `app` (real authenticateToken + requireRole + validate
 * middleware chain, real controllers/services) with only the Prisma
 * singleton mocked out (same approach as routes/__tests__/health.test.ts and
 * routes/__tests__/cron.routes.test.ts), so nothing here touches a real
 * database.
 *
 * `authenticateToken` loads the acting user's role from `prisma.user`
 * (DARE2CARE-19 — DB-sourced role, not the JWT claim), so each role is
 * represented by a fixed userId/role pair in USERS below and the mocked
 * `prisma.user.findFirst` resolves whichever one the minted token's
 * `userId` claims to be. Tokens themselves are minted with the real
 * `generateToken`/`verifyToken` (env.JWT_SECRET is set by src/test/setup.ts),
 * so the JWT layer itself is exercised for real.
 *
 * These tests assert the requireRole gate only: "allowed" means the request
 * is not rejected with 403 (a downstream 200/400/404/500 from a stubbed
 * repository is fine and expected, since payloads here are deliberately
 * minimal/invalid) — see spec "Tests" section.
 */
const {
  prismaMock,
} = vi.hoisted(() => {
  type MockModel = {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };

  const makeModel = (): MockModel => ({
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((args: any) =>
      Promise.resolve({ id: 'mock-id', ...(args?.data ?? {}) })
    ),
    update: vi.fn().mockImplementation((args: any) =>
      Promise.resolve({ id: 'mock-id', ...(args?.data ?? {}) })
    ),
    upsert: vi.fn().mockImplementation((args: any) =>
      Promise.resolve({ id: 'mock-id', ...(args?.update ?? args?.create ?? {}) })
    ),
    delete: vi.fn().mockResolvedValue({ id: 'mock-id' }),
    aggregate: vi.fn().mockResolvedValue({ _max: { displayOrder: 0 }, _sum: {} }),
    groupBy: vi.fn().mockResolvedValue([]),
  });

  const USERS: Record<string, { id: string; email: string; role: string; isActive: boolean }> = {
    'super-admin-id': { id: 'super-admin-id', email: 'super-admin@test.com', role: 'SUPER_ADMIN', isActive: true },
    'admin-id': { id: 'admin-id', email: 'admin@test.com', role: 'ADMIN', isActive: true },
    'content-manager-id': { id: 'content-manager-id', email: 'content-manager@test.com', role: 'CONTENT_MANAGER', isActive: true },
    'treasurer-id': { id: 'treasurer-id', email: 'treasurer@test.com', role: 'TREASURER', isActive: true },
  };

  const modelMocks: Record<string, MockModel> = {};

  const prismaMock = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === 'user') {
          if (!modelMocks.user) {
            modelMocks.user = makeModel();
            modelMocks.user.findFirst = vi.fn().mockImplementation((args: any) =>
              Promise.resolve(USERS[args?.where?.id] ?? null)
            );
          }
          return modelMocks.user;
        }
        if (!modelMocks[prop]) {
          modelMocks[prop] = makeModel();
        }
        return modelMocks[prop];
      },
    }
  );

  return { prismaMock, USERS };
});

vi.mock('../../config/database.config', () => ({ default: prismaMock }));

import app from '../../app';
import { generateToken } from '../../utils/jwt.util';

type TestRole = 'SUPER_ADMIN' | 'ADMIN' | 'CONTENT_MANAGER' | 'TREASURER';

const USER_IDS: Record<TestRole, string> = {
  SUPER_ADMIN: 'super-admin-id',
  ADMIN: 'admin-id',
  CONTENT_MANAGER: 'content-manager-id',
  TREASURER: 'treasurer-id',
};

const EMAILS: Record<TestRole, string> = {
  SUPER_ADMIN: 'super-admin@test.com',
  ADMIN: 'admin@test.com',
  CONTENT_MANAGER: 'content-manager@test.com',
  TREASURER: 'treasurer@test.com',
};

function bearerFor(role: TestRole): string {
  const token = generateToken({ userId: USER_IDS[role], email: EMAILS[role], role });
  return `Bearer ${token}`;
}

const NOT_FOUND_UUID = '11111111-1111-1111-1111-111111111111';

async function expectNotForbidden(
  role: TestRole,
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  body?: Record<string, unknown>
) {
  const req = request(app)[method](path).set('Authorization', bearerFor(role));
  const res = body ? await req.send(body) : await req;
  expect(res.status, `${role} ${method.toUpperCase()} ${path} -> ${res.status} ${JSON.stringify(res.body)}`).not.toBe(403);
}

async function expectForbidden(
  role: TestRole,
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  body?: Record<string, unknown>
) {
  const req = request(app)[method](path).set('Authorization', bearerFor(role));
  const res = body ? await req.send(body) : await req;
  expect(res.status).toBe(403);
}

describe('Admin RBAC coverage (DARE2CARE-25 / ADR-0008)', () => {
  describe('Content mutations (events/images/pages) -> CONTENT_MANAGE', () => {
    it('CONTENT_MANAGER can POST /events, /images, /pages', async () => {
      await expectNotForbidden('CONTENT_MANAGER', 'post', '/api/admin/events', {});
      await expectNotForbidden('CONTENT_MANAGER', 'post', '/api/admin/images', {});
      await expectNotForbidden('CONTENT_MANAGER', 'post', '/api/admin/pages', {});
    });

    it('TREASURER cannot POST /events or DELETE /pages/:slug', async () => {
      await expectForbidden('TREASURER', 'post', '/api/admin/events', {});
      await expectForbidden('TREASURER', 'delete', `/api/admin/pages/some-slug`);
    });

    it('SUPER_ADMIN and ADMIN still pass content mutation routes (regression)', async () => {
      for (const role of ['SUPER_ADMIN', 'ADMIN'] as TestRole[]) {
        await expectNotForbidden(role, 'post', '/api/admin/events', {});
        await expectNotForbidden(role, 'post', '/api/admin/images', {});
        await expectNotForbidden(role, 'post', '/api/admin/pages', {});
        await expectNotForbidden(role, 'delete', '/api/admin/pages/some-slug');
      }
    });

    it('leaves content reads open to every role, including TREASURER', async () => {
      await expectNotForbidden('TREASURER', 'get', '/api/admin/events');
      await expectNotForbidden('TREASURER', 'get', `/api/admin/events/${NOT_FOUND_UUID}`);
      await expectNotForbidden('TREASURER', 'get', '/api/admin/images');
      await expectNotForbidden('TREASURER', 'get', '/api/admin/pages');
    });

    it('gates the other content mutation routes named in the spec (PUT/DELETE events, images publish/slider)', async () => {
      // Forbidden role (TREASURER) is rejected before validation/controller logic runs.
      await expectForbidden('TREASURER', 'put', `/api/admin/events/${NOT_FOUND_UUID}`, {});
      await expectForbidden('TREASURER', 'delete', `/api/admin/events/${NOT_FOUND_UUID}`);
      await expectForbidden('TREASURER', 'put', `/api/admin/events/${NOT_FOUND_UUID}/publish`);
      await expectForbidden('TREASURER', 'put', `/api/admin/images/${NOT_FOUND_UUID}/publish`);
      await expectForbidden('TREASURER', 'put', `/api/admin/images/slider/reorder`, {});

      // Allowed role (CONTENT_MANAGER) passes the gate.
      await expectNotForbidden('CONTENT_MANAGER', 'put', `/api/admin/events/${NOT_FOUND_UUID}`, {});
      await expectNotForbidden('CONTENT_MANAGER', 'delete', `/api/admin/events/${NOT_FOUND_UUID}`);
      await expectNotForbidden('CONTENT_MANAGER', 'put', `/api/admin/images/${NOT_FOUND_UUID}/publish`);
    });
  });

  describe('File uploads -> CONTENT_MANAGE', () => {
    it('CONTENT_MANAGER can POST /upload/image', async () => {
      await expectNotForbidden('CONTENT_MANAGER', 'post', '/api/admin/upload/image');
    });

    it('TREASURER cannot POST /upload/image', async () => {
      await expectForbidden('TREASURER', 'post', '/api/admin/upload/image');
    });

    it('SUPER_ADMIN and ADMIN still pass /upload/image (regression)', async () => {
      await expectNotForbidden('SUPER_ADMIN', 'post', '/api/admin/upload/image');
      await expectNotForbidden('ADMIN', 'post', '/api/admin/upload/image');
    });

    it('gates the remaining upload routes (images, video, delete)', async () => {
      await expectForbidden('TREASURER', 'post', '/api/admin/upload/images');
      await expectForbidden('TREASURER', 'post', '/api/admin/upload/video');
      await expectForbidden('TREASURER', 'delete', '/api/admin/upload/event-images/some/path.jpg');

      await expectNotForbidden('CONTENT_MANAGER', 'post', '/api/admin/upload/images');
      await expectNotForbidden('CONTENT_MANAGER', 'post', '/api/admin/upload/video');
      await expectNotForbidden('CONTENT_MANAGER', 'delete', '/api/admin/upload/event-images/some/path.jpg');
    });
  });

  describe('Contacts', () => {
    it('reads -> CONTENT_MANAGE: TREASURER cannot GET /contacts, CONTENT_MANAGER can', async () => {
      await expectForbidden('TREASURER', 'get', '/api/admin/contacts');
      await expectNotForbidden('CONTENT_MANAGER', 'get', '/api/admin/contacts');
      await expectNotForbidden('CONTENT_MANAGER', 'get', `/api/admin/contacts/${NOT_FOUND_UUID}`);
    });

    it('markAsReplied -> ADMIN_ONLY: CONTENT_MANAGER cannot PUT /contacts/:id/replied', async () => {
      await expectForbidden('CONTENT_MANAGER', 'put', `/api/admin/contacts/${NOT_FOUND_UUID}/replied`);
      await expectForbidden('TREASURER', 'put', `/api/admin/contacts/${NOT_FOUND_UUID}/replied`);
    });

    it('SUPER_ADMIN and ADMIN still pass all contacts routes (regression)', async () => {
      for (const role of ['SUPER_ADMIN', 'ADMIN'] as TestRole[]) {
        await expectNotForbidden(role, 'get', '/api/admin/contacts');
        await expectNotForbidden(role, 'put', `/api/admin/contacts/${NOT_FOUND_UUID}/replied`);
      }
    });
  });

  describe('Notifications read log -> NOTIF_READ', () => {
    it('TREASURER can GET /notifications; CONTENT_MANAGER cannot', async () => {
      await expectNotForbidden('TREASURER', 'get', '/api/admin/notifications');
      await expectForbidden('CONTENT_MANAGER', 'get', '/api/admin/notifications');
    });

    it('GET /notifications/:id follows the same gate', async () => {
      await expectNotForbidden('TREASURER', 'get', `/api/admin/notifications/${NOT_FOUND_UUID}`);
      await expectForbidden('CONTENT_MANAGER', 'get', `/api/admin/notifications/${NOT_FOUND_UUID}`);
    });

    it('SUPER_ADMIN and ADMIN still pass (regression)', async () => {
      await expectNotForbidden('SUPER_ADMIN', 'get', '/api/admin/notifications');
      await expectNotForbidden('ADMIN', 'get', '/api/admin/notifications');
    });

    it('POST /notifications/send is unchanged: SUPER_ADMIN/ADMIN only', async () => {
      await expectForbidden('TREASURER', 'post', '/api/admin/notifications/send', {});
      await expectForbidden('CONTENT_MANAGER', 'post', '/api/admin/notifications/send', {});
      await expectNotForbidden('SUPER_ADMIN', 'post', '/api/admin/notifications/send', {});
      await expectNotForbidden('ADMIN', 'post', '/api/admin/notifications/send', {});
    });
  });

  describe('Regression — an already-gated route is untouched', () => {
    it('POST /users stays SUPER_ADMIN only', async () => {
      await expectForbidden('ADMIN', 'post', '/api/admin/users', {});
      await expectForbidden('CONTENT_MANAGER', 'post', '/api/admin/users', {});
      await expectForbidden('TREASURER', 'post', '/api/admin/users', {});
      await expectNotForbidden('SUPER_ADMIN', 'post', '/api/admin/users', {});
    });
  });

  describe('Regression — subscriber/student/teacher reads and finance routes are untouched', () => {
    it('subscriber/student/teacher GETs stay open to every role', async () => {
      await expectNotForbidden('CONTENT_MANAGER', 'get', '/api/admin/subscribers');
      await expectNotForbidden('TREASURER', 'get', '/api/admin/subscribers');
      await expectNotForbidden('CONTENT_MANAGER', 'get', '/api/admin/students');
      await expectNotForbidden('CONTENT_MANAGER', 'get', '/api/admin/teachers');
    });

    it('finance donation routes stay FINANCE_READ/FINANCE_WRITE/FINANCE_VOID gated', async () => {
      await expectForbidden('CONTENT_MANAGER', 'get', '/api/admin/finance/donations');
      await expectNotForbidden('TREASURER', 'get', '/api/admin/finance/donations');
    });
  });
});
