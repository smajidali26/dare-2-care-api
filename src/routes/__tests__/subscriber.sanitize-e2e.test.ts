import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { validate } from '../../middleware/validate.middleware';
import { errorHandler } from '../../middleware/errorHandler.middleware';
import { createSubscriberSchema, updateSubscriberSchema } from '../../validators/subscriber.validator';

/**
 * DARE2CARE-23 / ADR-0007 — end-to-end confirmation (not assumed) that the
 * validate() -> SubscriberController -> subscriber.service chain delivers
 * the SANITISED value of `managementBio` to the repository, and — because
 * the column is nullable — that `managementBio: null` round-trips as `null`
 * all the way to the repository call rather than being dropped or turned
 * into `''`.
 *
 * subscriber.service.ts uses the module-level repository singleton (not
 * constructor DI like Event/Page), so the repository module itself is
 * mocked here — the same approach routes/__tests__/health.test.ts uses for
 * config/database.config.
 */
const {
  mockFindByEmail,
  mockEmailExists,
  mockFindById,
  mockCreate,
  mockUpdate,
} = vi.hoisted(() => ({
  mockFindByEmail: vi.fn(),
  mockEmailExists: vi.fn(),
  mockFindById: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('../../repositories/subscriber.repository', () => ({
  default: {
    findByEmail: mockFindByEmail,
    emailExists: mockEmailExists,
    findById: mockFindById,
    create: mockCreate,
    update: mockUpdate,
  },
}));

import { SubscriberController } from '../../controllers/subscriber.controller';

function buildApp() {
  const app = express();
  app.use(express.json());

  const subscriberController = new SubscriberController();

  app.post('/subscribers', validate(createSubscriberSchema), subscriberController.create);
  app.put('/subscribers/:id', validate(updateSubscriberSchema), subscriberController.update);
  app.use(errorHandler);
  return app;
}

const validBase = {
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phoneNumber: '+1234567890',
  monthlyDonationAmount: 50,
  subscriberType: 'GENERAL',
  paymentType: 'DONATION',
};

describe('POST /subscribers — the repository receives sanitised managementBio', () => {
  it('strips <script> from managementBio before it reaches the repository', async () => {
    mockFindByEmail.mockResolvedValue(null);
    mockCreate.mockImplementation((data) => Promise.resolve({ id: 'sub-1', ...data }));
    const app = buildApp();

    const res = await request(app)
      .post('/subscribers')
      .send({ ...validBase, managementBio: '<p>Chair</p><script>alert(1)</script>' });

    expect(res.status).toBe(201);
    const persisted = mockCreate.mock.calls[0][0];
    expect(persisted.managementBio).not.toContain('<script');
    expect(persisted.managementBio).toContain('<p>Chair</p>');
  });

  it('round-trips managementBio: null as null (not "", not dropped)', async () => {
    mockFindByEmail.mockResolvedValue(null);
    mockCreate.mockClear();
    mockCreate.mockImplementation((data) => Promise.resolve({ id: 'sub-1', ...data }));
    const app = buildApp();

    const res = await request(app)
      .post('/subscribers')
      .send({ ...validBase, managementBio: null });

    expect(res.status).toBe(201);
    const persisted = mockCreate.mock.calls[0][0];
    expect(persisted.managementBio).toBeNull();
  });
});

describe('PUT /subscribers/:id — the repository receives sanitised managementBio', () => {
  it('strips <script> from managementBio on update', async () => {
    mockFindById.mockResolvedValue({ id: 'sub-1', email: 'jane@example.com' });
    mockUpdate.mockClear();
    mockUpdate.mockImplementation((id, data) => Promise.resolve({ id, ...data }));
    const app = buildApp();

    const res = await request(app)
      .put('/subscribers/11111111-1111-1111-1111-111111111111')
      .send({ managementBio: '<p>Updated</p><script>alert(1)</script>' });

    expect(res.status).toBe(200);
    const [, persisted] = mockUpdate.mock.calls[0];
    expect(persisted.managementBio).not.toContain('<script');
    expect(persisted.managementBio).toContain('<p>Updated</p>');
  });

  it('round-trips managementBio: null as null on update (explicit clear reaches the repository)', async () => {
    mockFindById.mockResolvedValue({ id: 'sub-1', email: 'jane@example.com' });
    mockUpdate.mockClear();
    mockUpdate.mockImplementation((id, data) => Promise.resolve({ id, ...data }));
    const app = buildApp();

    const res = await request(app)
      .put('/subscribers/11111111-1111-1111-1111-111111111111')
      .send({ managementBio: null });

    expect(res.status).toBe(200);
    const [, persisted] = mockUpdate.mock.calls[0];
    expect(persisted.managementBio).toBeNull();
  });
});
