import { z } from 'zod';

/**
 * Homepage Validators
 * Request validation schemas for the editable sections of the public homepage
 */

/**
 * Icons a "What We Do" card can show. Names are Heroicons v1 (outline), the set
 * the homepage already used. The admin portal and the public website each keep
 * a lookup from these names to SVG paths, so a new icon has to be added in all
 * three repos.
 */
export const WHAT_WE_DO_ICONS = [
  'book-open',
  'academic-cap',
  'user-group',
  'heart',
  'support',
  'home',
  'globe-alt',
  'light-bulb',
  'star',
  'sparkles',
  'briefcase',
  'puzzle',
  'gift',
  'chat-alt-2',
  'trending-up',
  'shield-check',
  'emoji-happy',
  'calendar',
] as const;

/**
 * Accent colours for a card's icon. Each front-end maps these names to literal
 * Tailwind classes; arbitrary colour values are deliberately not accepted.
 */
export const WHAT_WE_DO_COLORS = [
  'blue',
  'green',
  'purple',
  'orange',
  'red',
  'pink',
  'teal',
  'indigo',
] as const;

export const WHAT_WE_DO_MAX_ITEMS = 6;

export const whatWeDoItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Card title is required')
    .max(80, 'Card title must be 80 characters or less'),
  description: z
    .string()
    .trim()
    .min(1, 'Card description is required')
    .max(300, 'Card description must be 300 characters or less'),
  icon: z.enum(WHAT_WE_DO_ICONS),
  color: z.enum(WHAT_WE_DO_COLORS),
});

/**
 * The stored shape of the section. Also used to re-check what comes back out of
 * the database, so it must stay backwards compatible with saved content.
 */
export const whatWeDoContentSchema = z.object({
  heading: z
    .string()
    .trim()
    .min(1, 'Heading is required')
    .max(100, 'Heading must be 100 characters or less'),
  // Optional: an empty subheading is simply not shown.
  subheading: z
    .string()
    .trim()
    .max(250, 'Subheading must be 250 characters or less')
    .default(''),
  items: z
    .array(whatWeDoItemSchema)
    .min(1, 'Add at least one card')
    .max(WHAT_WE_DO_MAX_ITEMS, `Use at most ${WHAT_WE_DO_MAX_ITEMS} cards`),
});

export type WhatWeDoContent = z.infer<typeof whatWeDoContentSchema>;

/**
 * Update "What We Do" Schema
 * The whole section is saved at once, so every field is required.
 */
export const updateWhatWeDoSchema = z.object({
  body: whatWeDoContentSchema,
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
});
