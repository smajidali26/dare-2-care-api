import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { validate } from '../../middleware/validate.middleware';
import { errorHandler } from '../../middleware/errorHandler.middleware';
import { createEventSchema, updateEventSchema, eventIdSchema } from '../../validators/event.validator';
import { EventService } from '../../services/event.service';
import { EventController } from '../../controllers/event.controller';

/**
 * DARE2CARE-23 / ADR-0007 — end-to-end confirmation (not assumed) that the
 * validate() -> controller -> service chain delivers the SANITISED value of
 * `content`, not the raw attacker-supplied HTML. `validate()` (DARE2CARE-53)
 * assigns Zod's parsed/transformed body back onto `req.body`, and every
 * controller here spreads `req.body` straight into the service, so this
 * proves the sanitiser's output is what actually reaches the repository.
 */
function buildApp(fakeRepository: {
  findById: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  slugExists: ReturnType<typeof vi.fn>;
}) {
  const app = express();
  app.use(express.json());

  const eventService = new EventService(fakeRepository as any);
  const eventController = new EventController(eventService);

  app.post('/events', validate(createEventSchema), eventController.create);
  app.put('/events/:id', validate(eventIdSchema), validate(updateEventSchema), eventController.update);
  app.use(errorHandler);
  return app;
}

describe('POST /events — the repository receives sanitised content, not raw HTML', () => {
  it('strips <script> before the value reaches the repository', async () => {
    const fakeRepository = {
      findById: vi.fn(),
      update: vi.fn(),
      slugExists: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'event-1', ...data })),
    };
    const app = buildApp(fakeRepository);

    const res = await request(app).post('/events').send({
      title: 'Fundraiser',
      description: 'A community fundraiser',
      content: '<p>Join us</p><script>alert(document.cookie)</script>',
      eventDate: '2026-09-01T00:00:00.000Z',
      location: 'Community Hall',
    });

    expect(res.status).toBe(201);
    expect(fakeRepository.create).toHaveBeenCalledTimes(1);
    const persisted = fakeRepository.create.mock.calls[0][0];
    expect(persisted.content).not.toContain('<script');
    expect(persisted.content).not.toContain('alert(');
    expect(persisted.content).toContain('<p>Join us</p>');
  });
});

describe('PUT /events/:id — the repository receives sanitised content, not raw HTML', () => {
  it('strips <script> and neutralises javascript: hrefs before the value reaches the repository', async () => {
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
      create: vi.fn(),
    };
    const app = buildApp(fakeRepository);

    const res = await request(app)
      .put('/events/11111111-1111-1111-1111-111111111111')
      .send({
        content:
          '<p>Updated</p><script>alert(1)</script><a href="javascript:alert(1)">bad link</a>',
      });

    expect(res.status).toBe(200);
    const [, persisted] = fakeRepository.update.mock.calls[0];
    expect(persisted.content).not.toContain('<script');
    expect(persisted.content).not.toContain('javascript:');
    expect(persisted.content).toContain('<p>Updated</p>');
  });
});
