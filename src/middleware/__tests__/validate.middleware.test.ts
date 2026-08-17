import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { validate } from '../validate.middleware';
import { errorHandler } from '../errorHandler.middleware';

/**
 * DARE2CARE-53 — `validate()` must assign the parsed, stripped body back to
 * `req.body`, guarded by `parsed.body !== undefined` so that a params-only
 * schema (used ahead of a second, body-validating middleware on a chained
 * route, e.g. `PUT /events/:id`) never wipes out the body before the next
 * validator runs.
 */

const widgetBodySchema = z.object({
  body: z.object({
    name: z.string(),
    quantity: z.number(),
  }),
});

const idParamsOnlySchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

function buildEchoApp() {
  const app = express();
  app.use(express.json());
  app.post('/widgets', validate(widgetBodySchema), (req, res) => {
    res.status(200).json({ success: true, receivedBody: req.body });
  });
  app.put(
    '/widgets/:id',
    validate(idParamsOnlySchema), // declares params only — no `body`
    validate(widgetBodySchema), // declares body — this must still see the full payload
    (req, res) => {
      res.status(200).json({ success: true, receivedBody: req.body, id: req.params.id });
    }
  );
  app.use(errorHandler);
  return app;
}

describe('validate() — req.body sanitisation', () => {
  it('strips an undeclared field from req.body before the handler runs', async () => {
    const res = await request(buildEchoApp())
      .post('/widgets')
      .send({ name: 'Widget', quantity: 3, isDeleted: true, id: 'attacker-supplied-id' });

    expect(res.status).toBe(200);
    expect(res.body.receivedBody).toEqual({ name: 'Widget', quantity: 3 });
    expect(res.body.receivedBody).not.toHaveProperty('isDeleted');
    expect(res.body.receivedBody).not.toHaveProperty('id');
  });

  it('passes a declared field through untouched', async () => {
    const res = await request(buildEchoApp())
      .post('/widgets')
      .send({ name: 'Widget', quantity: 3 });

    expect(res.status).toBe(200);
    expect(res.body.receivedBody).toEqual({ name: 'Widget', quantity: 3 });
  });

  it('still rejects a request that fails validation with 400', async () => {
    const res = await request(buildEchoApp()).post('/widgets').send({ name: 'Widget' }); // missing quantity

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it(
    'REGRESSION (chained validators): a params-only schema (like eventIdSchema) does not wipe ' +
      'req.body before a second, body-validating middleware runs — the classic ' +
      "`validate(eventIdSchema), validate(updateEventSchema)` trap",
    async () => {
      const res = await request(buildEchoApp())
        .put('/widgets/widget-123')
        .send({ name: 'Widget', quantity: 5, extraField: 'should be stripped' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('widget-123');
      // The body must have survived the first (params-only) validate() call intact,
      // then been correctly stripped by the second (body) validate() call.
      expect(res.body.receivedBody).toEqual({ name: 'Widget', quantity: 5 });
      expect(res.body.receivedBody).not.toHaveProperty('extraField');
    }
  );
});
