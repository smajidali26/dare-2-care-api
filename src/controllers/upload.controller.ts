import { Request, Response } from 'express';
import storageService from '../services/storage.service';
import { STORAGE_BUCKETS, StorageBucket } from '../config/supabase.config';
import { getParamAsString } from '../utils/params.util';

/**
 * Upload Controller
 * Handles file upload endpoints
 */
export class UploadController {
  /**
   * Upload single image
   * POST /api/admin/upload/image
   */
  async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file provided',
        });
        return;
      }

      // Get bucket from query or default to event-images
      const bucket = (req.query.bucket as StorageBucket) || STORAGE_BUCKETS.EVENT_IMAGES;

      // Validate bucket
      if (!Object.values(STORAGE_BUCKETS).includes(bucket)) {
        res.status(400).json({
          success: false,
          message: 'Invalid bucket name',
        });
        return;
      }

      // Validate file
      const validation = storageService.validateFile(req.file, 'IMAGE');
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          message: validation.error,
        });
        return;
      }

      // Generate unique filename
      const filename = storageService.generateUniqueFilename(req.file.originalname);

      // Upload to storage
      const result = await storageService.uploadFile(bucket, req.file, filename);

      if (!result.success) {
        res.status(500).json({
          success: false,
          message: result.error || 'Upload failed',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          path: result.path,
          url: result.publicUrl,
          bucket,
          fileSize: req.file.size,
        },
      });
    } catch (error) {
      console.error('Upload image error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  /**
   * Upload multiple images
   * POST /api/admin/upload/images
   */
  async uploadImages(req: Request, res: Response): Promise<void> {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No files provided',
        });
        return;
      }

      // Get bucket from query or default to event-images
      const bucket = (req.query.bucket as StorageBucket) || STORAGE_BUCKETS.EVENT_IMAGES;

      // Validate bucket
      if (!Object.values(STORAGE_BUCKETS).includes(bucket)) {
        res.status(400).json({
          success: false,
          message: 'Invalid bucket name',
        });
        return;
      }

      // Upload multiple files
      const results = await storageService.uploadMultipleFiles(bucket, req.files, 'IMAGE');

      // Check if all uploads were successful
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      res.status(200).json({
        success: true,
        data: {
          uploaded: successful.map(r => ({
            path: r.path,
            url: r.publicUrl,
            fileSize: r.fileSize || 0,
          })),
          failed: failed.map(r => ({
            error: r.error,
          })),
          bucket,
        },
      });
    } catch (error) {
      console.error('Upload images error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  /**
   * Upload single video
   * POST /api/admin/upload/video
   */
  async uploadVideo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file provided',
        });
        return;
      }

      // Get bucket from query or default to event-videos
      const bucket = (req.query.bucket as StorageBucket) || STORAGE_BUCKETS.EVENT_VIDEOS;

      // Validate bucket
      if (!Object.values(STORAGE_BUCKETS).includes(bucket)) {
        res.status(400).json({
          success: false,
          message: 'Invalid bucket name',
        });
        return;
      }

      // Validate file
      const validation = storageService.validateFile(req.file, 'VIDEO');
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          message: validation.error,
        });
        return;
      }

      // Generate unique filename
      const filename = storageService.generateUniqueFilename(req.file.originalname);

      // Upload to storage
      const result = await storageService.uploadFile(bucket, req.file, filename);

      if (!result.success) {
        res.status(500).json({
          success: false,
          message: result.error || 'Upload failed',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          path: result.path,
          url: result.publicUrl,
          bucket,
          fileSize: req.file.size,
        },
      });
    } catch (error) {
      console.error('Upload video error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  /**
   * Delete uploaded file
   * DELETE /api/admin/upload/:bucket/:path
   */
  async deleteUpload(req: Request, res: Response): Promise<void> {
    try {
      const bucket = getParamAsString(req.params.bucket);
      const path = req.params[0] || '';

      // Validate bucket
      if (!Object.values(STORAGE_BUCKETS).includes(bucket as StorageBucket)) {
        res.status(400).json({
          success: false,
          message: 'Invalid bucket name',
        });
        return;
      }

      if (!path) {
        res.status(400).json({
          success: false,
          message: 'File path is required',
        });
        return;
      }

      // Delete from storage
      const result = await storageService.deleteFile(bucket as StorageBucket, path);

      if (!result.success) {
        res.status(500).json({
          success: false,
          message: result.error || 'Delete failed',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      console.error('Delete upload error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }
}

export default new UploadController();
