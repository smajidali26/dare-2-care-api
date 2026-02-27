import { SystemSetting } from '@prisma/client';
import prisma from '../config/database.config';

export class SettingRepository {
  async findAll(): Promise<SystemSetting[]> {
    return prisma.systemSetting.findMany({ orderBy: [{ category: 'asc' }, { key: 'asc' }] });
  }

  async findByKey(key: string): Promise<SystemSetting | null> {
    return prisma.systemSetting.findUnique({ where: { key } });
  }

  async findByCategory(category: string): Promise<SystemSetting[]> {
    return prisma.systemSetting.findMany({ where: { category }, orderBy: { key: 'asc' } });
  }

  async upsert(data: { key: string; value: string; category?: string; description?: string | null }): Promise<SystemSetting> {
    return prisma.systemSetting.upsert({
      where: { key: data.key },
      update: { value: data.value, category: data.category, description: data.description },
      create: { key: data.key, value: data.value, category: data.category || 'general', description: data.description },
    });
  }

  async delete(key: string): Promise<SystemSetting> {
    return prisma.systemSetting.delete({ where: { key } });
  }
}
