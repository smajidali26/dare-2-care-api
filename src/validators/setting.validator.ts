import { z } from 'zod';

export const upsertSettingSchema = z.object({
  body: z.object({
    key: z.string().min(1, 'Key is required').max(100).regex(/^[a-z0-9_]+(?:\.[a-z0-9_]+)*$/, 'Key must be lowercase with dots/underscores (e.g., "site.name")'),
    value: z.string().min(1, 'Value is required'),
    category: z.string().max(50).optional(),
    description: z.string().max(500).optional().nullable(),
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});

export const settingKeySchema = z.object({
  body: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  params: z.object({
    key: z.string().min(1),
  }),
});

export const settingQuerySchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
  query: z.object({
    category: z.string().optional(),
  }).passthrough(),
});
