import { Request, Response, NextFunction } from 'express';
import { ContactService } from '../services/contact.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamAsString } from '../utils/params.util';

/**
 * Contact Controller
 * Handles HTTP requests for contact form submissions
 */
export class ContactController {
  constructor(private contactService: ContactService) {}

  /**
   * POST /api/public/contact
   * Submit contact form (public endpoint)
   */
  submit = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const submission = await this.contactService.submitContact(req.body);

    res.status(201).json({
      success: true,
      data: submission,
      message: 'Contact form submitted successfully. We will get back to you soon.',
    });
  });

  /**
   * GET /api/admin/contacts
   * List all contact submissions (admin)
   */
  list = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { isRead, isReplied, page, limit } = req.query;

    const result = await this.contactService.getAllSubmissions({
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      isReplied: isReplied === 'true' ? true : isReplied === 'false' ? false : undefined,
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
   * GET /api/admin/contacts/:id
   * Get single contact submission (admin)
   */
  get = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    const submission = await this.contactService.getSubmissionById(id);

    res.json({
      success: true,
      data: submission,
    });
  });

  /**
   * PUT /api/admin/contacts/:id/replied
   * Mark contact submission as replied (admin)
   */
  markAsReplied = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const id = getParamAsString(req.params.id);
    const submission = await this.contactService.markAsReplied(id);

    res.json({
      success: true,
      data: submission,
      message: 'Contact submission marked as replied',
    });
  });
}
