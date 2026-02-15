import { Image, Prisma } from '@prisma/client';
import { ImageRepository } from '../repositories/image.repository';
import { AppError } from '../utils/AppError';

/**
 * Image Service
 * Business logic for image library management
 */
export class ImageService {
  constructor(private imageRepository: ImageRepository) {}

  /**
   * Get all images with filters
   */
  async getAllImages(filters: {
    search?: string;
    isSliderImage?: boolean;
    isPublished?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: Image[]; total: number; page: number; totalPages: number }> {
    const result = await this.imageRepository.findAll({
      search: filters.search,
      isSliderImage: filters.isSliderImage,
      isPublished: filters.isPublished,
      page: filters.page,
      limit: filters.limit,
    });

    return {
      data: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    };
  }

  /**
   * Get image by ID
   */
  async getImageById(id: string): Promise<Image> {
    const image = await this.imageRepository.findById(id);
    if (!image) {
      throw new AppError('Image not found', 404);
    }
    return image;
  }

  /**
   * Get published slider images
   */
  async getSliderImages(): Promise<Image[]> {
    return this.imageRepository.findSliderImages();
  }

  /**
   * Create new image
   */
  async createImage(data: {
    title: string;
    altText: string;
    description?: string;
    storageUrl: string;
    fileName: string;
    fileSize: number;
    isSliderImage?: boolean;
    isPublished?: boolean;
    displayOrder?: number;
  }): Promise<Image> {
    const imageData: Prisma.ImageCreateInput = {
      title: data.title,
      altText: data.altText,
      description: data.description,
      storageUrl: data.storageUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      isSliderImage: data.isSliderImage || false,
      isPublished: data.isPublished !== undefined ? data.isPublished : true,
      displayOrder: data.displayOrder || 0,
    };

    // If adding as slider image and no order specified, set to max + 1
    if (imageData.isSliderImage && !data.displayOrder) {
      const maxOrder = await this.imageRepository.getMaxDisplayOrder();
      imageData.displayOrder = maxOrder + 1;
    }

    return this.imageRepository.create(imageData);
  }

  /**
   * Update image
   */
  async updateImage(
    id: string,
    data: {
      title?: string;
      altText?: string;
      description?: string;
      isPublished?: boolean;
      displayOrder?: number;
    }
  ): Promise<Image> {
    // Check if image exists
    await this.getImageById(id);

    const updateData: Prisma.ImageUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.altText !== undefined) updateData.altText = data.altText;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;

    return this.imageRepository.update(id, updateData);
  }

  /**
   * Delete image
   */
  async deleteImage(id: string): Promise<void> {
    await this.getImageById(id);
    await this.imageRepository.softDelete(id);
  }

  /**
   * Mark image as slider image
   */
  async markAsSliderImage(id: string): Promise<Image> {
    const image = await this.getImageById(id);

    // If not already a slider image, set display order
    if (!image.isSliderImage) {
      const maxOrder = await this.imageRepository.getMaxDisplayOrder();
      await this.imageRepository.updateDisplayOrder(id, maxOrder + 1);
    }

    return this.imageRepository.toggleSliderImage(id, true);
  }

  /**
   * Unmark image as slider image
   */
  async unmarkAsSliderImage(id: string): Promise<Image> {
    await this.getImageById(id);
    return this.imageRepository.toggleSliderImage(id, false);
  }

  /**
   * Reorder slider images
   */
  async reorderSliderImages(imageOrders: Array<{ id: string; order: number }>): Promise<void> {
    // Verify all images exist and are slider images
    for (const item of imageOrders) {
      const image = await this.getImageById(item.id);
      if (!image.isSliderImage) {
        throw new AppError(`Image ${item.id} is not a slider image`, 400);
      }
    }

    // Update display orders
    for (const item of imageOrders) {
      await this.imageRepository.updateDisplayOrder(item.id, item.order);
    }
  }

  /**
   * Publish image
   */
  async publishImage(id: string): Promise<Image> {
    await this.getImageById(id);
    return this.imageRepository.publish(id);
  }

  /**
   * Unpublish image
   */
  async unpublishImage(id: string): Promise<Image> {
    await this.getImageById(id);
    return this.imageRepository.unpublish(id);
  }
}
