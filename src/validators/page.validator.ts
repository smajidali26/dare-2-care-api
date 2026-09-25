import { z } from 'zod';

/**
 * Website menu fields shared by create and update. An empty menu label or
 * heading means "use the title" and is stored as null by the service.
 */
const menuFields = {
  parentId: z.string().uuid('Invalid parent page').nullable().optional(),
  menuLabel: z.string().trim().max(60, 'Menu link text must be 60 characters or less').nullable().optional(),
  menuHeading: z.string().trim().max(60, 'Menu heading must be 60 characters or less').nullable().optional(),
  menuOrder: z.number().int('Menu position must be a whole number').min(0).max(9999).optional(),
};

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
      ...menuFields,
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
    ...menuFields,
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
