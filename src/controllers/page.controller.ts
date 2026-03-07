import { Request, Response } from 'express';
import { PageService } from '../services/page.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getParamAsString } from '../utils/params.util';

export class PageController {
  constructor(private pageService: PageService) {}

  create = asyncHandler(async (req: Request, res: Response) => {
    const page = await this.pageService.createPage(req.body);
    res.status(201).json({ success: true, data: page, message: 'Page created successfully' });
  });

  list = asyncHandler(async (req: Request, res: Response) => {
    const pages = await this.pageService.getAllPages();
    res.json({ success: true, data: pages });
  });

  getBySlug = asyncHandler(async (req: Request, res: Response) => {
    const slug = getParamAsString(req.params.slug);
    const page = await this.pageService.getPageBySlug(slug);
    if (!page) {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }
    res.json({ success: true, data: page });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const slug = getParamAsString(req.params.slug);
    const page = await this.pageService.updatePage(slug, req.body);
    res.json({ success: true, data: page, message: 'Page updated successfully' });
  });

  getPublished = asyncHandler(async (req: Request, res: Response) => {
    const slug = getParamAsString(req.params.slug);
    const page = await this.pageService.getPublishedPageBySlug(slug);
    if (!page) {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }
    res.json({ success: true, data: page });
  });
}
