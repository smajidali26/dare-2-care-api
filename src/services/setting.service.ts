import { SettingRepository } from '../repositories/setting.repository';
import { SystemSetting } from '@prisma/client';
import { AppError } from '../utils/AppError';

export class SettingService {
  constructor(private settingRepository: SettingRepository) {}

  async getAllSettings(): Promise<SystemSetting[]> {
    return this.settingRepository.findAll();
  }

  async getByKey(key: string): Promise<SystemSetting | null> {
    return this.settingRepository.findByKey(key);
  }

  async getByCategory(category: string): Promise<SystemSetting[]> {
    return this.settingRepository.findByCategory(category);
  }

  async upsertSetting(data: { key: string; value: string; category?: string; description?: string | null }): Promise<SystemSetting> {
    return this.settingRepository.upsert(data);
  }

  async deleteSetting(key: string): Promise<SystemSetting> {
    const existing = await this.settingRepository.findByKey(key);
    if (!existing) {
      throw new AppError('Setting not found', 404);
    }
    return this.settingRepository.delete(key);
  }
}
