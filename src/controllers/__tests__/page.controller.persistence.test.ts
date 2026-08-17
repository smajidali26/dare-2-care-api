import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { validate } from '../../middleware/validate.middleware';
import { errorHandler } from '../../middleware/errorHandler.middleware';
import { createPageSchema } from '../../validators/page.validator';
import { PageService } from '../../services/page.service';
import { PageController } from '../../controllers/page.controller';

/**
 * DARE2CARE-53 — regression test for the confirmed-vulnerable pair called out
 * in the spec: an undeclared "real column" sent in the body must never reach
 * Prisma. Full request path — validate() -> PageController -> PageService ->
 * repository.create — with a fake repository standing in for Prisma.
 */
function buildApp(fakeRepository: { findBySlug: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }) {
  const app = express();
  app.use(express.json());

  const pageService = new PageService(fakeRepository as any);
  const pageController = new PageController(pageService);

  app.post('/pages', validate(createPageSchema), pageController.create);
  app.use(errorHandler);
  return app;
}

describe('POST /pages — undeclared real column is not persisted', () => {
  it('does not forward isDeleted/id/updatedAt supplied in the body to the repository', async () => {
    const fakeRepository = {
      findBySlug: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'page-1', slug: 'about-us' }),
    };
    const app = buildApp(fakeRepository);

    const res = await request(app)
      .post('/pages')
      .send({
        slug: 'about-us',
        title: 'About Us',
        content: '<p>Hello</p>',
        // undeclared real columns an attacker (or a careless client) might send:
        id: 'attacker-supplied-uuid',
        isDeleted: true,
        updatedAt: '2000-01-01T00:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect(fakeRepository.create).toHaveBeenCalledTimes(1);
    const persisted = fakeRepository.create.mock.calls[0][0];
    expect(persisted).not.toHaveProperty('id');
    expect(persisted).not.toHaveProperty('isDeleted');
    expect(persisted).not.toHaveProperty('updatedAt');
    expect(persisted.slug).toBe('about-us');
  });

  it('still persists a declared field (title) untouched', async () => {
    const fakeRepository = {
      findBySlug: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'page-1', slug: 'about-us' }),
    };
    const app = buildApp(fakeRepository);

    const res = await request(app).post('/pages').send({
      slug: 'about-us',
      title: 'About Us',
      content: '<p>Hello</p>',
    });

    expect(res.status).toBe(201);
    const persisted = fakeRepository.create.mock.calls[0][0];
    expect(persisted.title).toBe('About Us');
    expect(persisted.content).toBe('<p>Hello</p>');
  });
});
