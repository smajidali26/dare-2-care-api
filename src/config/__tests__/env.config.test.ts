import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * DARE2CARE-18 — validate required environment variables at startup.
 *
 * env.config.ts validates process.env at module-load time and calls
 * process.exit(1) on failure, so each scenario needs a fresh module
 * instance (vi.resetModules + dynamic import) with process.env set up for
 * that specific case.
 *
 * `dotenv` is mocked to a no-op: env.config.ts calls dotenv.config() itself,
 * and this repo's working copy has a real (gitignored-in-spirit but
 * currently present) `.env` file on disk. Without this mock, dotenv would
 * quietly backfill "missing" vars from that file and defeat the negative
 * test cases below. Production/CI runs from a checkout with no `.env` file,
 * so this mock only affects this in-process unit test, not real behaviour.
 */
vi.mock('dotenv', () => ({ default: { config: vi.fn() }, config: vi.fn() }));

const ORIGINAL_ENV = { ...process.env };

function setBaseValidEnv() {
  process.env.NODE_ENV = 'development';
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
  process.env.JWT_SECRET = 'a'.repeat(32);
  process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
  delete process.env.CRON_SECRET;
  delete process.env.CORS_ORIGINS;
}

describe('env.config', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it('loads successfully and freezes the result when all required vars are present and valid', async () => {
    setBaseValidEnv();

    const { env } = await import('../env.config');

    expect(env.DATABASE_URL).toBe(process.env.DATABASE_URL);
    expect(env.JWT_SECRET).toBe('a'.repeat(32));
    expect(Object.isFrozen(env)).toBe(true);
  });

  it('exits non-zero with a message naming JWT_SECRET when it is absent', async () => {
    setBaseValidEnv();
    delete process.env.JWT_SECRET;

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`__PROCESS_EXIT_${code}__`);
    }) as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(import('../env.config')).rejects.toThrow('__PROCESS_EXIT_1__');

    const loggedText = errorSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(loggedText).toContain('JWT_SECRET');
    // Never log the value of a secret.
    expect(loggedText).not.toContain('a'.repeat(32));

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('rejects when JWT_SECRET and JWT_REFRESH_SECRET are equal', async () => {
    setBaseValidEnv();
    const same = 'c'.repeat(32);
    process.env.JWT_SECRET = same;
    process.env.JWT_REFRESH_SECRET = same;

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`__PROCESS_EXIT_${code}__`);
    }) as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(import('../env.config')).rejects.toThrow('__PROCESS_EXIT_1__');

    const loggedText = errorSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(loggedText).toContain('JWT_REFRESH_SECRET');

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('requires CRON_SECRET and CORS_ORIGINS only in production', async () => {
    setBaseValidEnv();
    process.env.NODE_ENV = 'production';
    // CRON_SECRET / CORS_ORIGINS deliberately left unset.

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`__PROCESS_EXIT_${code}__`);
    }) as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(import('../env.config')).rejects.toThrow('__PROCESS_EXIT_1__');

    const loggedText = errorSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(loggedText).toContain('CRON_SECRET');
    expect(loggedText).toContain('CORS_ORIGINS');

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
