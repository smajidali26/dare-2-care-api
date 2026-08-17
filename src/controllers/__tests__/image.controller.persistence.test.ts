import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { validate } from '../../middleware/validate.middleware';
import { errorHandler } from '../../middleware/errorHandler.middleware';
import { createImageSchema } from '../../validators/image.validator';
import { ImageService } from '../../services/image.service';
import { ImageController } from '../../controllers/image.controller';

/**
 * DARE2CARE-53 — regression test for the confirmed-vulnerable pair called out
 * in the spec: an undeclared "real column" sent in the body (e.g. `isDeleted`,
 * or a spoofed `id`) must never reach Prisma. This exercises the full request
 * path — validate() -> ImageController -> ImageService -> repository.create —
 * with a fake repository standing in for Prisma, so the assertion is made at
 * the actual persistence boundary rather than against req.body alone.
 */
function buildApp(fakeRepository: { create: ReturnType<typeof vi.fn>; getMaxDisplayOrder: ReturnType<typeof vi.fn> }) {
  const app = express();
  app.use(express.json());

  const imageService = new ImageService(fakeRepository as any);
  const imageController = new ImageController(imageService);

  app.post('/images', validate(createImageSchema), imageController.create);
  app.use(errorHandler);
  return app;
}

describe('POST /images — undeclared real column is not persisted', () => {
  it('does not forward isDeleted/id/createdAt supplied in the body to the repository', async () => {
    const fakeRepository = {
      create: vi.fn().mockResolvedValue({ id: 'img-1' }),
      getMaxDisplayOrder: vi.fn().mockResolvedValue(0),
    };
    const app = buildApp(fakeRepository);

    const res = await request(app)
      .post('/images')
      .send({
        title: 'Community Day',
        altText: 'Community day photo',
        storageUrl: 'https://storage.example.com/img.jpg',
        fileName: 'img.jpg',
        fileSize: 1024,
        // undeclared real columns an attacker (or a careless client) might send:
        id: 'attacker-supplied-uuid',
        isDeleted: true,
        createdAt: '2000-01-01T00:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect(fakeRepository.create).toHaveBeenCalledTimes(1);
    const persisted = fakeRepository.create.mock.calls[0][0];
    expect(persisted).not.toHaveProperty('id');
    expect(persisted).not.toHaveProperty('isDeleted');
    expect(persisted).not.toHaveProperty('createdAt');
    expect(persisted.title).toBe('Community Day');
  });

  it('still persists a declared field (title) untouched', async () => {
    const fakeRepository = {
      create: vi.fn().mockResolvedValue({ id: 'img-1' }),
      getMaxDisplayOrder: vi.fn().mockResolvedValue(0),
    };
    const app = buildApp(fakeRepository);

    const res = await request(app).post('/images').send({
      title: 'Community Day',
      altText: 'Community day photo',
      storageUrl: 'https://storage.example.com/img.jpg',
      fileName: 'img.jpg',
      fileSize: 1024,
    });

    expect(res.status).toBe(201);
    const persisted = fakeRepository.create.mock.calls[0][0];
    expect(persisted.title).toBe('Community Day');
    expect(persisted.altText).toBe('Community day photo');
  });
});
