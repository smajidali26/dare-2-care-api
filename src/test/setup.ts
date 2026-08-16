/**
 * Global Vitest setup.
 *
 * Ensures the required env vars (validated by src/config/env.config.ts) are
 * present with safe dummy values BEFORE any test file — and therefore before
 * anything it imports (app.ts, routes, jwt.util, etc.) — ever loads that
 * module. This lets `npm test` run green from a clean checkout with no real
 * database or external credentials present.
 *
 * dotenv.config() (called inside env.config.ts) never overwrites variables
 * already present in process.env, so these dummies always win over anything
 * an untracked local `.env` file might contain.
 *
 * These are NOT real secrets — they exist only to satisfy shape/length
 * validation for tests that never open a real DB connection or sign a token
 * that's checked against a real deployment.
 */
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/test_db?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-value-for-vitest-0000000000';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'test-jwt-refresh-secret-value-for-vitest-1111111111';
