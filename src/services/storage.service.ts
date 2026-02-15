import { supabase, StorageBucket } from '../config/supabase.config';

/**
 * File validation rules
 */
const FILE_VALIDATION_RULES = {
  IMAGE: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  VIDEO: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
    allowedExtensions: ['.mp4', '.mov', '.avi'],
  },
} as const;

export type FileType = 'IMAGE' | 'VIDEO';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  fileSize?: number;
  error?: string;
}

export class StorageService {
  /**
   * Validate file based on type
   */
  validateFile(file: Express.Multer.File, type: FileType): FileValidationResult {
    const rules = FILE_VALIDATION_RULES[type];

    // Check file size
    if (file.size > rules.maxSize) {
      const maxSizeMB = rules.maxSize / (1024 * 1024);
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit`,
      };
    }

    // Check MIME type
    if (!(rules.allowedTypes as readonly string[]).includes(file.mimetype)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${rules.allowedExtensions.join(', ')}`,
      };
    }

    // Check file extension
    const fileExtension = file.originalname.toLowerCase().match(/\.[^.]*$/)?.[0];
    if (!fileExtension || !(rules.allowedExtensions as readonly string[]).includes(fileExtension)) {
      return {
        valid: false,
        error: `Invalid file extension. Allowed extensions: ${rules.allowedExtensions.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(
    bucket: StorageBucket,
    file: Express.Multer.File,
    path: string
  ): Promise<UploadResult> {
    try {
      if (!supabase) {
        return { success: false, error: 'Supabase storage is not configured' };
      }
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      const publicUrl = this.getPublicUrl(bucket, data.path);

      return {
        success: true,
        path: data.path,
        publicUrl,
        fileSize: file.size,
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Delete file from Supabase Storage
   */
  async deleteFile(bucket: StorageBucket, path: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        return { success: false, error: 'Supabase storage is not configured' };
      }
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Supabase delete error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * Get public URL for file
   */
  getPublicUrl(bucket: StorageBucket, path: string): string {
    if (!supabase) {
      return '';
    }
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Generate unique filename
   */
  generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const extension = originalName.match(/\.[^.]*$/)?.[0] || '';
    const baseName = originalName.replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9]/g, '-');

    return `${baseName}-${timestamp}-${random}${extension}`;
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    bucket: StorageBucket,
    files: Express.Multer.File[],
    type: FileType
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const file of files) {
      // Validate each file
      const validation = this.validateFile(file, type);
      if (!validation.valid) {
        results.push({
          success: false,
          error: validation.error,
        });
        continue;
      }

      // Generate unique path
      const filename = this.generateUniqueFilename(file.originalname);
      const path = filename;

      // Upload file
      const result = await this.uploadFile(bucket, file, path);
      results.push(result);
    }

    return results;
  }
}

export default new StorageService();
