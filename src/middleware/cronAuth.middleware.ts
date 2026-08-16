import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env.config';
import { AppError } from '../utils/AppError';

/**
 * Cron Authentication Middleware
 *
 * Single point of truth for verifying the `Authorization: Bearer <CRON_SECRET>`
 * header sent by Vercel Cron. Previously this check was duplicated inline in
 * `cron.controller.ts` (sendMonthlyReminders and healthCheck) and, when
 * `CRON_SECRET` was unset, built the literal string `Bearer undefined` —
 * which any caller sending that exact header could satisfy. This middleware
 * fails closed instead: a missing/empty secret always rejects the request.
 */
export const requireCronSecret = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const cronSecret = env.CRON_SECRET;

  if (!cronSecret) {
    // In production, item DARE2CARE-18 means the app never boots without
    // CRON_SECRET set. This branch is the defence for non-production
    // environments where the var may legitimately be absent.
    console.error(
      `[CronAuth] Rejected ${req.method} ${req.path}: CRON_SECRET is not configured`
    );
    next(new AppError('Unauthorized', 401));
    return;
  }

  const providedAuth = req.headers['authorization'] ?? '';
  const expectedAuth = `Bearer ${cronSecret}`;

  const expectedBuffer = Buffer.from(expectedAuth);
  const providedBuffer = Buffer.from(providedAuth);

  // Guard the length check first — crypto.timingSafeEqual throws on
  // mismatched-length buffers rather than returning false.
  const isAuthorized =
    expectedBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, providedBuffer);

  if (!isAuthorized) {
    next(new AppError('Unauthorized', 401));
    return;
  }

  next();
};
