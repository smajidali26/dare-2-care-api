import { Request, Response, NextFunction } from 'express';
import { ImageService } from '../services/image.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamAsString } from '../utils/params.util';

/**
 * Image Controller
 * Handles HTTP requests for image library management
 */
export class ImageController {
  constructor(private imageService: ImageService) {}

  /**
   * GET /api/admin/images
   * List all images with pagination and filters
   */
  list = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { search, isSliderImage, isPublished, page, limit } = req.query;

    const result = await this.imageService.getAllImages({
      search: search as string,
      isSliderImage: isSliderImage === 'true' ? true : isSliderImage === 'false' ? false : undefined,
      isPublished: isPublished === 'true' ? true : isPublished === 'false' ? false : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: limit ? parseInt(limit as string, 10) : 20,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * GET /api/admin/images/:id
   * Get single image by ID
   */
  get = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    const image = await this.imageService.getImageById(id);

    res.json({
      success: true,
      data: image,
    });
  });

  /**
   * POST /api/admin/images
   * Create new image
   */
  create = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const image = await this.imageService.createImage(req.body);

    res.status(201).json({
      success: true,
      data: image,
      message: 'Image created successfully',
    });
  });

  /**
   * PUT /api/admin/images/:id
   * Update image
   */
  update = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    const image = await this.imageService.updateImage(id, req.body);

    res.json({
      success: true,
      data: image,
      message: 'Image updated successfully',
    });
  });

  /**
   * DELETE /api/admin/images/:id
   * Delete image (soft delete)
   */
  delete = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    await this.imageService.deleteImage(id);

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  });

  /**
   * PUT /api/admin/images/:id/slider
   * Mark image as slider image
   */
  markAsSlider = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    const image = await this.imageService.markAsSliderImage(id);

    res.json({
      success: true,
      data: image,
      message: 'Image marked as slider image successfully',
    });
  });

  /**
   * DELETE /api/admin/images/:id/slider
   * Unmark image as slider image
   */
  unmarkAsSlider = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    const image = await this.imageService.unmarkAsSliderImage(id);

    res.json({
      success: true,
      data: image,
      message: 'Image unmarked as slider image successfully',
    });
  });

  /**
   * PUT /api/admin/images/slider/reorder
   * Reorder slider images
   */
  reorderSlider = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { imageOrders } = req.body;
    await this.imageService.reorderSliderImages(imageOrders);

    res.json({
      success: true,
      message: 'Slider images reordered successfully',
    });
  });

  /**
   * PUT /api/admin/images/:id/publish
   * Publish image
   */
  publish = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    const image = await this.imageService.publishImage(id);

    res.json({
      success: true,
      data: image,
      message: 'Image published successfully',
    });
  });

  /**
   * PUT /api/admin/images/:id/unpublish
   * Unpublish image
   */
  unpublish = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    const image = await this.imageService.unpublishImage(id);

    res.json({
      success: true,
      data: image,
      message: 'Image unpublished successfully',
    });
  });

  /**
   * GET /api/public/images/slider
   * Get published slider images (public endpoint)
   */
  getSliderImages = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const images = await this.imageService.getSliderImages();

    res.json({
      success: true,
      data: images,
    });
  });
}
