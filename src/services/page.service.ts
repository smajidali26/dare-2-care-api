import { PageRepository } from '../repositories/page.repository';
import { Page } from '@prisma/client';
import { AppError } from '../utils/AppError';

export class PageService {
  constructor(private pageRepository: PageRepository) {}

  async getPageBySlug(slug: string): Promise<Page | null> {
    return this.pageRepository.findBySlug(slug);
  }

  async getPublishedPageBySlug(slug: string): Promise<Page | null> {
    const page = await this.pageRepository.findBySlug(slug);
    if (!page || !page.isPublished) return null;
    return page;
  }

  async getAllPages(): Promise<Page[]> {
    return this.pageRepository.findAll();
  }

  async updatePage(
    slug: string,
    data: {
      title: string;
      content: string;
      metaDescription?: string | null;
      isPublished?: boolean;
    }
  ): Promise<Page> {
    return this.pageRepository.upsertBySlug(slug, data);
  }
}
