import { z } from 'zod';

/**
 * Event Validators
 * Request validation schemas for event operations
 */

/**
 * Create Event Schema
 */
export const createEventSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters'),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(500, 'Description must be less than 500 characters'),
    content: z
      .string()
      .min(1, 'Content is required'),
    eventDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date format',
      })
      .transform((val) => new Date(val)),
    location: z
      .string()
      .min(1, 'Location is required')
      .max(200, 'Location must be less than 200 characters'),
    metaDescription: z
      .string()
      .max(160, 'Meta description must be less than 160 characters')
      .optional(),
    isPublished: z.boolean().optional().default(false),
  }),
});

/**
 * Update Event Schema
 */
export const updateEventSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters')
      .optional(),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(500, 'Description must be less than 500 characters')
      .optional(),
    content: z
      .string()
      .min(1, 'Content is required')
      .optional(),
    eventDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date format',
      })
      .transform((val) => new Date(val))
      .optional(),
    location: z
      .string()
      .min(1, 'Location is required')
      .max(200, 'Location must be less than 200 characters')
      .optional(),
    metaDescription: z
      .string()
      .max(160, 'Meta description must be less than 160 characters')
      .optional(),
    isPublished: z.boolean().optional(),
  }),
});

/**
 * Event Media Schema
 */
export const eventMediaSchema = z.object({
  body: z.object({
    mediaType: z.enum(['IMAGE', 'VIDEO'], {
      errorMap: () => ({ message: 'Media type must be IMAGE or VIDEO' }),
    }),
    storageUrl: z.string().url('Invalid storage URL'),
    fileName: z
      .string()
      .min(1, 'File name is required'),
    fileSize: z
      .number()
      .positive('File size must be positive')
      .int('File size must be an integer'),
    caption: z.string().max(500, 'Caption must be less than 500 characters').optional(),
    displayOrder: z.number().int('Display order must be an integer').optional().default(0),
  }),
});

/**
 * Update Media Order Schema
 */
export const updateMediaOrderSchema = z.object({
  body: z.object({
    displayOrder: z
      .number()
      .int('Display order must be an integer')
      .min(0, 'Display order must be non-negative'),
  }),
});

/**
 * Query Filters Schema
 */
export const eventFiltersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    isPublished: z
      .string()
      .optional()
      .transform((val) => val === 'true' || val === '1'),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10)),
  }),
});

/**
 * Event ID Param Schema
 */
export const eventIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid event ID format'),
  }),
});

/**
 * Media ID Param Schema
 */
export const mediaIdSchema = z.object({
  params: z.object({
    mediaId: z.string().uuid('Invalid media ID format'),
  }),
});

/**
 * Event Slug Param Schema
 */
export const eventSlugSchema = z.object({
  params: z.object({
    slug: z.string().min(1, 'Slug is required'),
  }),
});
