import { Router, Request, Response } from 'express';
import prisma from '../config/database.config';
import { generateToken } from '../utils/jwt.util';

const router = Router();

router.get('/test', async (req: Request, res: Response) => {
  try {
    // Test database
    const userCount = await prisma.user.count();

    // Test JWT
    const testToken = generateToken({
      userId: 'test-id',
      email: 'test@test.com',
      role: 'USER'
    });

    res.json({
      success: true,
      data: {
        database: {
          connected: true,
          userCount
        },
        jwt: {
          working: !!testToken,
          hasSecret: !!process.env.JWT_SECRET,
          hasRefreshSecret: !!process.env.JWT_REFRESH_SECRET
        },
        env: {
          nodeEnv: process.env.NODE_ENV
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

export default router;
