import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Middleware
 * Protects against brute force attacks
 */

/**
 * These limiters key on `req.ip`, which is only the real visitor's address
 * because `app.set('trust proxy', 1)` is configured in app.ts. If that setting
 * is ever removed, every limiter below silently degrades into a single global
 * bucket shared by the whole internet.
 */

/**
 * Login rate limiter
 * Allows 5 FAILED login attempts per 15 minutes per IP.
 *
 * Successful logins are not counted: an admin who signs in legitimately several
 * times a day (new tab, expired session, second device) should never be able to
 * lock themselves out, while brute-force guessing still stops after 5 misses.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 failed attempts per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many login attempts. Please try again after 15 minutes.',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Only failed attempts count towards the limit
  skipFailedRequests: false,
});

/**
 * General API rate limiter
 * Allows 600 requests per 15 minutes per IP.
 *
 * This limiter covers both the public site and the admin portal. The admin
 * portal is a SPA that issues several XHRs per screen (the dashboard alone
 * fetches stats plus each list it links to), so a staff member working through
 * events, images and pages moves through requests far faster than a public
 * visitor. 600/15min (~40/minute sustained) leaves ordinary editing untouched
 * while still capping scripted abuse.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // Limit each IP to 600 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Contact form rate limiter
 * Allows 5 submissions per 15 minutes per IP to prevent spam
 */
export const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 submissions per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many contact form submissions. Please try again after 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
