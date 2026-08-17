import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { validate } from '../../middleware/validate.middleware';
import { errorHandler } from '../../middleware/errorHandler.middleware';
import { eventIdSchema, updateEventSchema } from '../../validators/event.validator';
import { EventService } from '../../services/event.service';
import { EventController } from '../../controllers/event.controller';

/**
 * DARE2CARE-53 — the exact trap called out in the spec:
 *
 *   router.put('/events/:id', validate(eventIdSchema), validate(updateEventSchema), eventController.update);
 *
 * `eventIdSchema` declares `params` only, so parsing against it yields
 * `parsed.body === undefined`. Before the guard, assigning unconditionally
 * would set `req.body = undefined` and destroy the payload before
 * `updateEventSchema` (the second validate() call) ever ran. This test wires
 * up the real chained route (real middleware, real controller, real service)
 * against a fake repository, and proves the full body still reaches the
 * service on update.
 */
function buildApp(fakeRepository: {
  findById: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  slugExists: ReturnType<typeof vi.fn>;
}) {
  const app = express();
  app.use(express.json());

  const eventService = new EventService(fakeRepository as any);
  const eventController = new EventController(eventService);

  app.put(
    '/events/:id',
    validate(eventIdSchema),
    validate(updateEventSchema),
    eventController.update
  );
  app.use(errorHandler);
  return app;
}

describe('PUT /events/:id — chained validate(eventIdSchema), validate(updateEventSchema)', () => {
  it('still receives and persists the full body after both validators run', async () => {
    const existingEvent = {
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Old Title',
      slug: 'old-title',
      description: 'Old description',
      content: 'Old content',
      location: 'Old location',
      isPublished: false,
    };

    const fakeRepository = {
      findById: vi.fn().mockResolvedValue(existingEvent),
      update: vi.fn().mockImplementation((id, data) => Promise.resolve({ ...existingEvent, ...data })),
      slugExists: vi.fn().mockResolvedValue(false),
    };
    const app = buildApp(fakeRepository);

    const res = await request(app)
      .put('/events/11111111-1111-1111-1111-111111111111')
      .send({
        description: 'Updated description',
        content: 'Updated content',
        location: 'Updated location',
        isPublished: true,
      });

    expect(res.status).toBe(200);
    expect(fakeRepository.update).toHaveBeenCalledTimes(1);
    const [, persisted] = fakeRepository.update.mock.calls[0];
    // If req.body had been wiped to undefined by the first (params-only)
    // validate() call, updateEventSchema would have rejected an undefined
    // body with a 400 and the service would never have been reached.
    expect(persisted.description).toBe('Updated description');
    expect(persisted.content).toBe('Updated content');
    expect(persisted.location).toBe('Updated location');
    expect(persisted.isPublished).toBe(true);
  });

  it('strips an undeclared field from the body before it reaches the service', async () => {
    const existingEvent = {
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Old Title',
      slug: 'old-title',
      description: 'Old description',
      content: 'Old content',
      location: 'Old location',
      isPublished: false,
    };

    const fakeRepository = {
      findById: vi.fn().mockResolvedValue(existingEvent),
      update: vi.fn().mockImplementation((id, data) => Promise.resolve({ ...existingEvent, ...data })),
      slugExists: vi.fn().mockResolvedValue(false),
    };
    const app = buildApp(fakeRepository);

    const res = await request(app)
      .put('/events/11111111-1111-1111-1111-111111111111')
      .send({
        description: 'Updated description',
        isDeleted: true, // undeclared real column
      });

    expect(res.status).toBe(200);
    const [, persisted] = fakeRepository.update.mock.calls[0];
    expect(persisted).not.toHaveProperty('isDeleted');
    expect(persisted.description).toBe('Updated description');
  });
});
