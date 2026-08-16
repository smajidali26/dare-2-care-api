import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Environment Configuration
 *
 * Single source of truth for required/optional environment variables.
 * Validated once at module load so a missing or malformed value fails loudly
 * at boot instead of degrading into wrong runtime behaviour later.
 *
 * NOTE: This module owns loading the `.env` file (via dotenv) as well as
 * validating it. It must be the FIRST import in `src/server.ts` so that
 * failure happens before the app wires up routes/DB/anything else and
 * before a port is bound. `dotenv.config()` never overwrites variables that
 * are already present in `process.env` (e.g. set by the OS, CI, or a test
 * setup file), so this is safe to call unconditionally.
 */
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z
  .object({
    // Required in every environment
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

    // Required in production only (see superRefine below)
    CRON_SECRET: z.string().optional(),
    CORS_ORIGINS: z.string().optional(),

    // Optional — existing graceful-degradation behaviour is preserved by
    // the modules that consume these (e.g. supabase.config.ts warns + returns
    // null when Supabase vars are absent).
    SUPABASE_URL: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_MESSAGING_SERVICE_SID: z.string().optional(),
    TWILIO_PHONE_NUMBER: z.string().optional(),
    ADMIN_NOTIFICATION_EMAIL: z.string().optional(),
    FROM_EMAIL: z.string().optional(),
    PORT: z.string().optional(),
    JWT_EXPIRES_IN: z.string().optional(),
    JWT_REFRESH_EXPIRES_IN: z.string().optional(),
    DIRECT_URL: z.string().optional(),
    NODE_ENV: z.string().optional(),

    // Stripe (online donations) — optional, never required (not even in
    // production): stripe.gateway.ts degrades gracefully and disables online
    // payments when absent, rather than crashing at import or boot.
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.JWT_SECRET && data.JWT_REFRESH_SECRET && data.JWT_SECRET === data.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_REFRESH_SECRET must not equal JWT_SECRET',
        path: ['JWT_REFRESH_SECRET'],
      });
    }

    if (isProduction) {
      if (!data.CRON_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CRON_SECRET is required when NODE_ENV=production',
          path: ['CRON_SECRET'],
        });
      }
      if (!data.CORS_ORIGINS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CORS_ORIGINS is required when NODE_ENV=production',
          path: ['CORS_ORIGINS'],
        });
      }
    }
  });

export type Env = Readonly<z.infer<typeof envSchema>>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    // Log only variable names / validation messages — NEVER the values.
    const failingVars = result.error.issues.map((issue) => issue.path.join('.') || '(root)');
    console.error(
      `[env.config] Environment validation failed. Invalid or missing variable(s): ${failingVars.join(', ')}`
    );
    for (const issue of result.error.issues) {
      console.error(`[env.config]   - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    process.exit(1);
  }

  return Object.freeze(result.data);
}

export const env: Env = loadEnv();
