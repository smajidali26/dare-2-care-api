import { z } from 'zod';

export const updatePageSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    content: z.string().min(1, 'Content is required'),
    metaDescription: z.string().max(160).optional().nullable(),
    isPublished: z.boolean().optional(),
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
