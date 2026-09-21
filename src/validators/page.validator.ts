import { z } from 'zod';

/**
 * Every field is optional so callers can send a partial update — e.g. flipping
 * only `isPublished` to unpublish a page. `.refine` keeps an entirely empty body
 * from being accepted as a no-op "success". A field that IS sent still has to be
 * valid: `title` and `content` cannot be blanked out.
 */
export const updatePageSchema = z.object({
  body: z
    .object({
      title: z.string().min(1, 'Title is required').max(200).optional(),
      content: z.string().min(1, 'Content is required').optional(),
      metaDescription: z.string().max(160).optional().nullable(),
      isPublished: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'Provide at least one field to update',
    }),
  params: z.object({
    slug: z.string().min(1),
  }),
  query: z.object({}).passthrough(),
});

export const createPageSchema = z.object({
  body: z.object({
    slug: z
      .string()
      .min(1, 'Slug is required')
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only (e.g., "about-us")'),
    title: z.string().min(1, 'Title is required').max(200),
    content: z.string().min(1, 'Content is required'),
    metaDescription: z.string().max(160).optional().nullable(),
    isPublished: z.boolean().optional(),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const pageSlugSchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    slug: z.string().min(1),
  }),
});
