import { z } from 'zod';

/**
 * Image Validators
 * Request validation schemas for image library operations
 */

/**
 * Create Image Schema
 */
export const createImageSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters'),
    altText: z
      .string()
      .min(1, 'Alt text is required')
      .max(200, 'Alt text must be less than 200 characters'),
    description: z
      .string()
      .max(1000, 'Description must be less than 1000 characters')
      .optional(),
    storageUrl: z.string().url('Invalid storage URL'),
    fileName: z.string().min(1, 'File name is required'),
    fileSize: z
      .number()
      .positive('File size must be positive')
      .int('File size must be an integer'),
    isSliderImage: z.boolean().optional().default(false),
    isPublished: z.boolean().optional().default(true),
    displayOrder: z.number().int('Display order must be an integer').optional(),
  }),
});

/**
 * Update Image Schema
 */
export const updateImageSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters')
      .optional(),
    altText: z
      .string()
      .min(1, 'Alt text is required')
      .max(200, 'Alt text must be less than 200 characters')
      .optional(),
    description: z
      .string()
      .max(1000, 'Description must be less than 1000 characters')
      .optional(),
    isPublished: z.boolean().optional(),
    displayOrder: z.number().int('Display order must be an integer').optional(),
  }),
});

/**
 * Reorder Slider Images Schema
 */
export const reorderSliderImagesSchema = z.object({
  body: z.object({
    imageOrders: z.array(
      z.object({
        id: z.string().uuid('Invalid image ID format'),
        order: z.number().int('Order must be an integer').min(0, 'Order must be non-negative'),
      })
    ),
  }),
});

/**
 * Query Filters Schema
 */
export const imageFiltersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    isSliderImage: z
      .string()
      .optional()
      .transform((val) => val === 'true' || val === '1'),
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
      .transform((val) => (val ? parseInt(val, 10) : 20)),
  }),
});

/**
 * Image ID Param Schema
 */
export const imageIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid image ID format'),
  }),
});
