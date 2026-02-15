import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { loginRateLimiter } from '../middleware/rateLimit.middleware';

/**
 * Authentication Routes
 * Handles user authentication and authorization
 */

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate user and return JWT tokens
 * Rate limited to 5 attempts per 15 minutes
 */
router.post('/login', loginRateLimiter, authController.login);

/**
 * POST /api/auth/logout
 * Logout user and clear tokens
 */
router.post('/logout', authController.logout);

/**
 * GET /api/auth/me
 * Get current authenticated user details
 * Protected route - requires valid JWT
 */
router.get('/me', authenticateToken, authController.me);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', authController.refresh);

export default router;
