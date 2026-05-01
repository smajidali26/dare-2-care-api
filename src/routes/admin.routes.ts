import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import * as statsController from '../controllers/stats.controller';
import { UserController } from '../controllers/user.controller';
import { SubscriberController } from '../controllers/subscriber.controller';
import { StudentController } from '../controllers/student.controller';
import { TeacherController } from '../controllers/teacher.controller';
import uploadController from '../controllers/upload.controller';
import {
  uploadSingleImage,
  uploadMultipleImages,
  uploadSingleVideo,
  handleMulterError,
} from '../middleware/upload.middleware';
import prisma from '../config/database.config';
import { EventRepository } from '../repositories/event.repository';
import { EventService } from '../services/event.service';
import { EventController } from '../controllers/event.controller';
import { validate } from '../middleware/validate.middleware';
import {
  createEventSchema,
  updateEventSchema,
  eventMediaSchema,
  updateMediaOrderSchema,
  eventFiltersSchema,
  eventIdSchema,
  mediaIdSchema,
} from '../validators/event.validator';
import { ImageRepository } from '../repositories/image.repository';
import { ImageService } from '../services/image.service';
import { ImageController } from '../controllers/image.controller';
import {
  createImageSchema,
  updateImageSchema,
  reorderSliderImagesSchema,
  imageFiltersSchema,
  imageIdSchema,
} from '../validators/image.validator';
import { ContactRepository } from '../repositories/contact.repository';
import { ContactService } from '../services/contact.service';
import { ContactController } from '../controllers/contact.controller';
import { contactFiltersSchema, contactIdSchema } from '../validators/contact.validator';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationService } from '../services/notification.service';
import { NotificationController } from '../controllers/notification.controller';
import { notificationFiltersSchema, notificationIdSchema, broadcastNotificationSchema } from '../validators/notification.validator';
import { PageRepository } from '../repositories/page.repository';
import { PageService } from '../services/page.service';
import { PageController } from '../controllers/page.controller';
import { createPageSchema, updatePageSchema, pageSlugSchema } from '../validators/page.validator';
import { SettingRepository } from '../repositories/setting.repository';
import { SettingService } from '../services/setting.service';
import { SettingController } from '../controllers/setting.controller';
import { upsertSettingSchema, settingKeySchema, settingQuerySchema } from '../validators/setting.validator';
import {
  createUserSchema,
  updateUserSchema,
  userIdSchema,
  userQuerySchema,
} from '../validators/user.validator';
import {
  createSubscriberSchema,
  updateSubscriberSchema,
  subscriberIdSchema,
  subscriberQuerySchema,
} from '../validators/subscriber.validator';
import {
  createStudentSchema,
  updateStudentSchema,
  studentIdSchema,
  studentQuerySchema,
} from '../validators/student.validator';
import {
  createTeacherSchema,
  updateTeacherSchema,
  teacherIdSchema,
  teacherQuerySchema,
} from '../validators/teacher.validator';
import { generalRateLimiter } from '../middleware/rateLimit.middleware';

/**
 * Admin Routes
 * All routes require authentication
 * Some routes require specific roles
 */

const router = Router();

// Apply rate limiter and authentication middleware to all admin routes
router.use(generalRateLimiter);
router.use(authenticateToken);

/**
 * Initialize User, Subscriber, Student, Teacher Controllers
 */
const userController = new UserController();
const subscriberController = new SubscriberController();
const studentController = new StudentController();
const teacherController = new TeacherController();

/**
 * Initialize Event Services
 */
const eventRepository = new EventRepository(prisma);
const eventService = new EventService(eventRepository);
const eventController = new EventController(eventService);

/**
 * Initialize Image Services
 */
const imageRepository = new ImageRepository(prisma);
const imageService = new ImageService(imageRepository);
const imageController = new ImageController(imageService);

/**
 * Initialize Notification Services (notificationRepository is also used by ContactService)
 */
const notificationRepository = new NotificationRepository(prisma);
const notificationService = new NotificationService(notificationRepository);
const notificationController = new NotificationController(notificationService);

/**
 * Initialize Contact Services
 */
const contactRepository = new ContactRepository(prisma);
const contactService = new ContactService(contactRepository, notificationRepository);
const contactController = new ContactController(contactService);

/**
 * Initialize Page Services
 */
const pageRepository = new PageRepository();
const pageService = new PageService(pageRepository);
const pageController = new PageController(pageService);

/**
 * Initialize Setting Services
 */
const settingRepository = new SettingRepository();
const settingService = new SettingService(settingRepository);
const settingController = new SettingController(settingService);

/**
 * Dashboard Stats Route
 * Accessible to all authenticated admin users
 */
router.get('/stats', statsController.getStats);

/**
 * User Management Routes
 * Restricted to SUPER_ADMIN and ADMIN roles
 */
router.get(
  '/users',
  requireRole(['SUPER_ADMIN', 'ADMIN']),
  validate(userQuerySchema),
  userController.list
);

router.get(
  '/users/:id',
  requireRole(['SUPER_ADMIN', 'ADMIN']),
  validate(userIdSchema),
  userController.get
);

router.post(
  '/users',
  requireRole(['SUPER_ADMIN']),
  validate(createUserSchema),
  userController.create
);

router.put(
  '/users/:id',
  requireRole(['SUPER_ADMIN', 'ADMIN']),
  validate(updateUserSchema),
  userController.update
);

router.delete(
  '/users/:id',
  requireRole(['SUPER_ADMIN']),
  validate(userIdSchema),
  userController.delete
);

router.post(
  '/users/:id/restore',
  requireRole(['SUPER_ADMIN']),
  validate(userIdSchema),
  userController.restore
);

/**
 * Subscriber Management Routes
 * Accessible to all authenticated admin users
 */
router.get('/subscribers', validate(subscriberQuerySchema), subscriberController.list);
router.get('/subscribers/:id', validate(subscriberIdSchema), subscriberController.get);
router.post('/subscribers', requireRole(['SUPER_ADMIN', 'ADMIN']), validate(createSubscriberSchema), subscriberController.create);
router.put('/subscribers/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), validate(updateSubscriberSchema), subscriberController.update);
router.delete('/subscribers/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), validate(subscriberIdSchema), subscriberController.delete);
router.post('/subscribers/:id/restore', requireRole(['SUPER_ADMIN', 'ADMIN']), validate(subscriberIdSchema), subscriberController.restore);

/**
 * Student Management Routes
 * Accessible to all authenticated admin users
 */
router.get('/students', validate(studentQuerySchema), studentController.list);
router.get('/students/:id', validate(studentIdSchema), studentController.get);
router.post('/students', requireRole(['SUPER_ADMIN', 'ADMIN']), validate(createStudentSchema), studentController.create);
router.put('/students/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), validate(updateStudentSchema), studentController.update);
router.delete('/students/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), validate(studentIdSchema), studentController.delete);
router.post('/students/:id/restore', requireRole(['SUPER_ADMIN', 'ADMIN']), validate(studentIdSchema), studentController.restore);

/**
 * Teacher Management Routes
 * Accessible to all authenticated admin users
 */
router.get('/teachers', validate(teacherQuerySchema), teacherController.list);
router.get('/teachers/:id', validate(teacherIdSchema), teacherController.get);
router.post('/teachers', requireRole(['SUPER_ADMIN', 'ADMIN']), validate(createTeacherSchema), teacherController.create);
router.put('/teachers/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), validate(updateTeacherSchema), teacherController.update);
router.delete('/teachers/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), validate(teacherIdSchema), teacherController.delete);
router.post('/teachers/:id/restore', requireRole(['SUPER_ADMIN', 'ADMIN']), validate(teacherIdSchema), teacherController.restore);

/**
 * File Upload Routes
 * Accessible to all authenticated admin users
 */
router.post(
  '/upload/image',
  uploadSingleImage,
  handleMulterError,
  uploadController.uploadImage
);

router.post(
  '/upload/images',
  uploadMultipleImages,
  handleMulterError,
  uploadController.uploadImages
);

router.post(
  '/upload/video',
  uploadSingleVideo,
  handleMulterError,
  uploadController.uploadVideo
);

router.delete(
  '/upload/:bucket/*',
  uploadController.deleteUpload
);

/**
 * Event Management Routes
 * Accessible to all authenticated admin users
 */
router.get('/events', validate(eventFiltersSchema), eventController.list);
router.get('/events/:id', validate(eventIdSchema), eventController.get);
router.post('/events', validate(createEventSchema), eventController.create);
router.put('/events/:id', validate(eventIdSchema), validate(updateEventSchema), eventController.update);
router.delete('/events/:id', validate(eventIdSchema), eventController.delete);

// Event publishing
router.put('/events/:id/publish', validate(eventIdSchema), eventController.publish);
router.put('/events/:id/unpublish', validate(eventIdSchema), eventController.unpublish);

// Event media management
router.get('/events/:id/media', validate(eventIdSchema), eventController.getMedia);
router.post('/events/:id/media', validate(eventIdSchema), validate(eventMediaSchema), eventController.addMedia);
router.delete('/events/:id/media/:mediaId', validate(eventIdSchema), validate(mediaIdSchema), eventController.deleteMedia);
router.put('/events/:id/media/:mediaId', validate(eventIdSchema), validate(mediaIdSchema), validate(updateMediaOrderSchema), eventController.updateMediaOrder);

/**
 * Image Library Management Routes
 * Accessible to all authenticated admin users
 */
router.get('/images', validate(imageFiltersSchema), imageController.list);

// Slider reorder must be registered before dynamic /:id routes so Express
// doesn't match "slider" as an :id parameter.
router.put('/images/slider/reorder', validate(reorderSliderImagesSchema), imageController.reorderSlider);

router.get('/images/:id', validate(imageIdSchema), imageController.get);
router.post('/images', validate(createImageSchema), imageController.create);
router.put('/images/:id', validate(imageIdSchema), validate(updateImageSchema), imageController.update);
router.delete('/images/:id', validate(imageIdSchema), imageController.delete);

// Image publishing
router.put('/images/:id/publish', validate(imageIdSchema), imageController.publish);
router.put('/images/:id/unpublish', validate(imageIdSchema), imageController.unpublish);

// Slider membership toggles (specific to a single image)
router.put('/images/:id/slider', validate(imageIdSchema), imageController.markAsSlider);
router.delete('/images/:id/slider', validate(imageIdSchema), imageController.unmarkAsSlider);

/**
 * Contact Submission Management Routes (Admin)
 * Accessible to all authenticated admin users
 */
router.get('/contacts', validate(contactFiltersSchema), contactController.list);
router.get('/contacts/:id', validate(contactIdSchema), contactController.get);
router.put('/contacts/:id/replied', validate(contactIdSchema), contactController.markAsReplied);

/**
 * Notification Log Management Routes (Admin)
 * Accessible to all authenticated admin users
 */
router.get('/notifications', validate(notificationFiltersSchema), notificationController.list);
router.get('/notifications/:id', validate(notificationIdSchema), notificationController.get);
router.post(
  '/notifications/send',
  requireRole(['SUPER_ADMIN', 'ADMIN']),
  validate(broadcastNotificationSchema),
  notificationController.send
);

/**
 * Page/Content Management Routes (Admin)
 * Accessible to all authenticated admin users
 */
router.get('/pages', pageController.list);
router.post('/pages', validate(createPageSchema), pageController.create);
router.get('/pages/:slug', validate(pageSlugSchema), pageController.getBySlug);
router.put('/pages/:slug', validate(updatePageSchema), pageController.update);
router.delete('/pages/:slug', validate(pageSlugSchema), pageController.delete);

/**
 * System Settings Routes (Admin)
 * Restricted to SUPER_ADMIN role
 */
router.get('/settings', requireRole(['SUPER_ADMIN']), validate(settingQuerySchema), settingController.list);
router.get('/settings/:key', requireRole(['SUPER_ADMIN']), validate(settingKeySchema), settingController.get);
router.post('/settings', requireRole(['SUPER_ADMIN']), validate(upsertSettingSchema), settingController.upsert);
router.delete('/settings/:key', requireRole(['SUPER_ADMIN']), validate(settingKeySchema), settingController.delete);

export default router;
