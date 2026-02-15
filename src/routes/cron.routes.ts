import { Router } from 'express';
import prisma from '../config/database.config';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationService } from '../services/notification.service';
import { CronController } from '../controllers/cron.controller';

/**
 * Cron Routes
 * Protected by CRON_SECRET header
 * These routes are designed to be called by scheduled jobs
 */

const router = Router();

/**
 * Initialize Services
 */
const notificationRepository = new NotificationRepository(prisma);
const notificationService = new NotificationService(notificationRepository);
const cronController = new CronController(prisma, notificationService);

/**
 * Cron Job Endpoints
 * Note: Vercel Cron Jobs send GET requests, not POST
 */
// Health check
router.get('/health', cronController.healthCheck);

// Send monthly payment reminders (Vercel Cron uses GET)
router.get('/payment-reminders', cronController.sendMonthlyReminders);

export default router;
