import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('WARNING: Missing Supabase environment variables. File upload features will be unavailable.');
}

/**
 * Supabase client instance for server-side operations
 * Uses service role key for admin privileges
 */
export const supabase: SupabaseClient | null = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null;

/**
 * Storage bucket names
 */
export const STORAGE_BUCKETS = {
  EVENT_IMAGES: 'event-images',
  EVENT_VIDEOS: 'event-videos',
  SLIDER_IMAGES: 'slider-images',
  PROFILE_IMAGES: 'profile-images',
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];
