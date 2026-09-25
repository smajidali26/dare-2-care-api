import { Request, Response } from 'express';
import { HomepageService } from '../services/homepage.service';
import { asyncHandler } from '../utils/asyncHandler';

export class HomepageController {
  constructor(private homepageService: HomepageService) {}

  getWhatWeDo = asyncHandler(async (req: Request, res: Response) => {
    const section = await this.homepageService.getWhatWeDo();
    res.json({ success: true, data: section });
  });

  updateWhatWeDo = asyncHandler(async (req: Request, res: Response) => {
    const section = await this.homepageService.updateWhatWeDo(req.body);
    res.json({ success: true, data: section, message: 'What We Do section saved successfully' });
  });
}
