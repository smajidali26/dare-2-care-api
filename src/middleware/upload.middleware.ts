import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

/**
 * Configure multer for memory storage
 * Files are stored in memory as Buffer objects
 */
const storage = multer.memoryStorage();

/**
 * File size limits
 */
const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024,  // 10MB
  VIDEO: 100 * 1024 * 1024, // 100MB
};

/**
 * Allowed MIME types
 */
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
];

/**
 * File filter for images
 */
const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

/**
 * File filter for videos
 */
const videoFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP4, MOV, and AVI videos are allowed.'));
  }
};

/**
 * Multer upload configurations
 */

// Single image upload
export const uploadSingleImage = multer({
  storage,
  limits: { fileSize: FILE_SIZE_LIMITS.IMAGE },
  fileFilter: imageFileFilter,
}).single('image');

// Multiple images upload (max 10 files)
export const uploadMultipleImages = multer({
  storage,
  limits: {
    fileSize: FILE_SIZE_LIMITS.IMAGE,
    files: 10,
  },
  fileFilter: imageFileFilter,
}).array('images', 10);

// Single video upload
export const uploadSingleVideo = multer({
  storage,
  limits: { fileSize: FILE_SIZE_LIMITS.VIDEO },
  fileFilter: videoFileFilter,
}).single('video');

/**
 * Error handler for multer errors
 */
export const handleMulterError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large',
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files',
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name',
      });
    }
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'File upload error',
    });
  }

  next();
};
