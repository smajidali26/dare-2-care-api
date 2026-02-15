import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import * as statsController from '../controllers/stats.controller';
import * as userController from '../controllers/user.controller';
import * as subscriberController from '../controllers/subscriber.controller';
import * as studentController from '../controllers/student.controller';
import * as teacherController from '../controllers/teacher.controller';
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
import { notificationFiltersSchema, notificationIdSchema } from '../validators/notification.validator';
import { PageRepository } from '../repositories/page.repository';
import { PageService } from '../services/page.service';
import { PageController } from '../controllers/page.controller';
import { updatePageSchema, pageSlugSchema } from '../validators/page.validator';

/**
 * Admin Routes
 * All routes require authentication
 * Some routes require specific roles
 */

const router = Router();

// Apply authentication middleware to all admin routes
router.use(authenticateToken);

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
 * Initialize Contact Services
 */
const contactRepository = new ContactRepository(prisma);
const contactService = new ContactService(contactRepository);
const contactController = new ContactController(contactService);

/**
 * Initialize Notification Services
 */
const notificationRepository = new NotificationRepository(prisma);
const notificationService = new NotificationService(notificationRepository);
const notificationController = new NotificationController(notificationService);

/**
 * Initialize Page Services
 */
const pageRepository = new PageRepository();
const pageService = new PageService(pageRepository);
const pageController = new PageController(pageService);

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
  userController.getAllUsers
);

router.get(
  '/users/:id',
  requireRole(['SUPER_ADMIN', 'ADMIN']),
  userController.getUserById
);

router.post(
  '/users',
  requireRole(['SUPER_ADMIN']),
  userController.createUser
);

router.put(
  '/users/:id',
  requireRole(['SUPER_ADMIN', 'ADMIN']),
  userController.updateUser
);

router.delete(
  '/users/:id',
  requireRole(['SUPER_ADMIN']),
  userController.deleteUser
);

/**
 * Subscriber Management Routes
 * Accessible to all authenticated admin users
 */
router.get('/subscribers', subscriberController.getAllSubscribers);
router.get('/subscribers/:id', subscriberController.getSubscriberById);
router.post('/subscribers', subscriberController.createSubscriber);
router.put('/subscribers/:id', subscriberController.updateSubscriber);
router.delete('/subscribers/:id', subscriberController.deleteSubscriber);

/**
 * Student Management Routes
 * Accessible to all authenticated admin users
 */
router.get('/students', studentController.getAllStudents);
router.get('/students/:id', studentController.getStudentById);
router.post('/students', studentController.createStudent);
router.put('/students/:id', studentController.updateStudent);
router.delete('/students/:id', studentController.deleteStudent);

/**
 * Teacher Management Routes
 * Accessible to all authenticated admin users
 */
router.get('/teachers', teacherController.getAllTeachers);
router.get('/teachers/:id', teacherController.getTeacherById);
router.post('/teachers', teacherController.createTeacher);
router.put('/teachers/:id', teacherController.updateTeacher);
router.delete('/teachers/:id', teacherController.deleteTeacher);

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
router.get('/images/:id', validate(imageIdSchema), imageController.get);
router.post('/images', validate(createImageSchema), imageController.create);
router.put('/images/:id', validate(imageIdSchema), validate(updateImageSchema), imageController.update);
router.delete('/images/:id', validate(imageIdSchema), imageController.delete);

// Image publishing
router.put('/images/:id/publish', validate(imageIdSchema), imageController.publish);
router.put('/images/:id/unpublish', validate(imageIdSchema), imageController.unpublish);

// Slider image management
router.put('/images/:id/slider', validate(imageIdSchema), imageController.markAsSlider);
router.delete('/images/:id/slider', validate(imageIdSchema), imageController.unmarkAsSlider);
router.put('/images/slider/reorder', validate(reorderSliderImagesSchema), imageController.reorderSlider);

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

/**
 * Page/Content Management Routes (Admin)
 * Accessible to all authenticated admin users
 */
router.get('/pages', pageController.list);
router.get('/pages/:slug', validate(pageSlugSchema), pageController.getBySlug);
router.put('/pages/:slug', validate(updatePageSchema), pageController.update);

export default router;
