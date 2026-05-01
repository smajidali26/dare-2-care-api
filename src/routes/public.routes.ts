import { Router } from 'express';
import prisma from '../config/database.config';
import { EventRepository } from '../repositories/event.repository';
import { EventService } from '../services/event.service';
import { EventController } from '../controllers/event.controller';
import { ImageRepository } from '../repositories/image.repository';
import { ImageService } from '../services/image.service';
import { ImageController } from '../controllers/image.controller';
import { ContactRepository } from '../repositories/contact.repository';
import { ContactService } from '../services/contact.service';
import { ContactController } from '../controllers/contact.controller';
import { NotificationRepository } from '../repositories/notification.repository';
import { SubscriberController } from '../controllers/subscriber.controller';
import { validate } from '../middleware/validate.middleware';
import { eventFiltersSchema, eventSlugSchema } from '../validators/event.validator';
import { submitContactSchema } from '../validators/contact.validator';
import { getParamAsString } from '../utils/params.util';
import { PageRepository } from '../repositories/page.repository';
import { PageService } from '../services/page.service';
import { PageController } from '../controllers/page.controller';
import { pageSlugSchema } from '../validators/page.validator';
import { generalRateLimiter, contactRateLimiter } from '../middleware/rateLimit.middleware';

/**
 * Public Routes
 * No authentication required
 */

const router = Router();

// Apply general rate limiter to all public routes
router.use(generalRateLimiter);

/**
 * Initialize Services
 */
const eventRepository = new EventRepository(prisma);
const eventService = new EventService(eventRepository);
const eventController = new EventController(eventService);

const imageRepository = new ImageRepository(prisma);
const imageService = new ImageService(imageRepository);
const imageController = new ImageController(imageService);

const contactRepository = new ContactRepository(prisma);
const notificationRepository = new NotificationRepository(prisma);
const contactService = new ContactService(contactRepository, notificationRepository);
const contactController = new ContactController(contactService);

const pageRepository = new PageRepository();
const pageService = new PageService(pageRepository);
const pageController = new PageController(pageService);

const subscriberController = new SubscriberController();

/**
 * Event Routes
 */
// List published events (only published events for public)
router.get('/events', validate(eventFiltersSchema), eventController.listPublished);

// Get published event by slug (only published events for public)
router.get('/events/:slug', validate(eventSlugSchema), eventController.getBySlugPublic);

/**
 * Image Routes
 */
// Get slider images
router.get('/images/slider', imageController.getSliderImages);

/**
 * Contact Routes
 */
// Submit contact form (with stricter rate limit to prevent spam)
router.post('/contact', contactRateLimiter, validate(submitContactSchema), contactController.submit);

/**
 * Management Routes
 */
// Get management members
router.get('/management', subscriberController.getManagementMembers);

/**
 * Page Routes
 */
// Get published page by slug
router.get('/pages/:slug', validate(pageSlugSchema), pageController.getPublished);

export default router;
