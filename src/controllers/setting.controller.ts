import { Request, Response } from 'express';
import { SettingService } from '../services/setting.service';
import { asyncHandler } from '../utils/asyncHandler';

export class SettingController {
  constructor(private settingService: SettingService) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.query;
    const settings = category
      ? await this.settingService.getByCategory(category as string)
      : await this.settingService.getAllSettings();
    res.json({ success: true, data: settings });
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const setting = await this.settingService.getByKey(req.params.key);
    if (!setting) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }
    res.json({ success: true, data: setting });
  });

  upsert = asyncHandler(async (req: Request, res: Response) => {
    const setting = await this.settingService.upsertSetting(req.body);
    res.json({ success: true, data: setting, message: 'Setting saved successfully' });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await this.settingService.deleteSetting(req.params.key);
    res.json({ success: true, message: 'Setting deleted successfully' });
  });
}
