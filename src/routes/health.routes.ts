import { Router, Request, Response } from 'express';
import prisma from '../config/database.config';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Basic health check endpoint
 * @access  Public
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: 'Server is running',
      data: {
        status: 'healthy',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        database: 'connected',
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Server is running but database is unavailable',
      data: {
        status: 'unhealthy',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      },
    });
  }
});

/**
 * @route   GET /api/health/db
 * @desc    Database-specific health check
 * @access  Public
 */
router.get('/db', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: 'Database connection is healthy',
      data: {
        status: 'connected',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

export default router;
