import { PrismaClient, Image, Prisma } from '@prisma/client';
import { BaseRepository, PaginatedResult } from './base.repository';

/**
 * Image Repository
 * Handles database operations for image library
 */
export class ImageRepository extends BaseRepository<Image> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'image');
  }

  /**
   * Find all images with optional filters
   */
  async findAll(filters: {
    search?: string;
    isSliderImage?: boolean;
    isPublished?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResult<Image>> {
    const where: Prisma.ImageWhereInput = {
      isDeleted: false,
    };

    // Search filter
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { altText: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Slider image filter
    if (filters.isSliderImage !== undefined) {
      where.isSliderImage = filters.isSliderImage;
    }

    // Published filter
    if (filters.isPublished !== undefined) {
      where.isPublished = filters.isPublished;
    }

    // Calculate pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.prisma.image.count({ where });

    // Get paginated data
    const data = await this.prisma.image.findMany({
      where,
      orderBy: [
        { isSliderImage: 'desc' }, // Slider images first
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: skip,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Find image by ID
   */
  async findById(id: string): Promise<Image | null> {
    return this.prisma.image.findFirst({
      where: { id, isDeleted: false },
    });
  }

  /**
   * Get published slider images
   */
  async findSliderImages(): Promise<Image[]> {
    return this.prisma.image.findMany({
      where: {
        isDeleted: false,
        isPublished: true,
        isSliderImage: true,
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Create new image
   */
  async create(data: Prisma.ImageCreateInput | Partial<Image>): Promise<Image> {
    return this.prisma.image.create({
      data: data as Prisma.ImageCreateInput,
    });
  }

  /**
   * Update image
   */
  async update(id: string, data: Prisma.ImageUpdateInput): Promise<Image> {
    return this.prisma.image.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete image
   */
  async softDelete(id: string): Promise<Image> {
    return this.prisma.image.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /**
   * Toggle slider image status
   */
  async toggleSliderImage(id: string, isSliderImage: boolean): Promise<Image> {
    return this.update(id, { isSliderImage });
  }

  /**
   * Update display order
   */
  async updateDisplayOrder(id: string, displayOrder: number): Promise<Image> {
    return this.update(id, { displayOrder });
  }

  /**
   * Get max display order for slider images
   */
  async getMaxDisplayOrder(): Promise<number> {
    const result = await this.prisma.image.aggregate({
      where: {
        isDeleted: false,
        isSliderImage: true,
      },
      _max: {
        displayOrder: true,
      },
    });

    return result._max.displayOrder || 0;
  }

  /**
   * Publish image
   */
  async publish(id: string): Promise<Image> {
    return this.update(id, { isPublished: true });
  }

  /**
   * Unpublish image
   */
  async unpublish(id: string): Promise<Image> {
    return this.update(id, { isPublished: false });
  }
}
