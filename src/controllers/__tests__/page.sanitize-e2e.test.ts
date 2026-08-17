import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { validate } from '../../middleware/validate.middleware';
import { errorHandler } from '../../middleware/errorHandler.middleware';
import { createPageSchema, updatePageSchema } from '../../validators/page.validator';
import { PageService } from '../../services/page.service';
import { PageController } from '../../controllers/page.controller';

/**
 * DARE2CARE-23 / ADR-0007 — end-to-end confirmation (not assumed) that the
 * validate() -> PageController -> PageService chain delivers the SANITISED
 * value of `content`, not the raw attacker-supplied HTML, to the repository.
 */
function buildApp(fakeRepository: {
  findBySlug: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  updateBySlug: ReturnType<typeof vi.fn>;
}) {
  const app = express();
  app.use(express.json());

  const pageService = new PageService(fakeRepository as any);
  const pageController = new PageController(pageService);

  app.post('/pages', validate(createPageSchema), pageController.create);
  app.put('/pages/:slug', validate(updatePageSchema), pageController.update);
  app.use(errorHandler);
  return app;
}

describe('POST /pages — the repository receives sanitised content, not raw HTML', () => {
  it('strips <script> and neutralises an onerror= handler before persistence', async () => {
    const fakeRepository = {
      findBySlug: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'page-1', ...data })),
      updateBySlug: vi.fn(),
    };
    const app = buildApp(fakeRepository);

    const res = await request(app)
      .post('/pages')
      .send({
        slug: 'about-us',
        title: 'About Us',
        content: '<p>Hello</p><script>alert(1)</script><img src="x" onerror="alert(1)">',
      });

    expect(res.status).toBe(201);
    const persisted = fakeRepository.create.mock.calls[0][0];
    expect(persisted.content).not.toContain('<script');
    expect(persisted.content).not.toContain('onerror');
    expect(persisted.content).toContain('<p>Hello</p>');
  });
});

describe('PUT /pages/:slug — the repository receives sanitised content, not raw HTML', () => {
  it('strips <script> before the value reaches the repository', async () => {
    const fakeRepository = {
      findBySlug: vi.fn().mockResolvedValue({ id: 'page-1', slug: 'about-us' }),
      create: vi.fn(),
      updateBySlug: vi.fn().mockImplementation((slug, data) => Promise.resolve({ id: 'page-1', slug, ...data })),
    };
    const app = buildApp(fakeRepository);

    const res = await request(app)
      .put('/pages/about-us')
      .send({ title: 'About Us', content: '<p>Updated</p><script>alert(1)</script>' });

    expect(res.status).toBe(200);
    const [, persisted] = fakeRepository.updateBySlug.mock.calls[0];
    expect(persisted.content).not.toContain('<script');
    expect(persisted.content).toContain('<p>Updated</p>');
  });
});
