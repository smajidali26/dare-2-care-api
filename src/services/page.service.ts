import { PageRepository } from '../repositories/page.repository';
import { Page } from '@prisma/client';
import { AppError } from '../utils/AppError';

/**
 * Slugs reserved by static public-site routes. A CMS page with one of these slugs
 * would be unreachable (the static route always wins) — reject at create time.
 */
const RESERVED_SLUGS = new Set([
  'about',
  'contact',
  'events',
  'admin',
  'api',
  'login',
  'logout',
  '_next',
  'favicon.ico',
  'sitemap.xml',
  'robots.txt',
]);

export class PageService {
  constructor(private pageRepository: PageRepository) {}

  async createPage(data: {
    slug: string;
    title: string;
    content: string;
    metaDescription?: string | null;
    isPublished?: boolean;
  }): Promise<Page> {
    if (RESERVED_SLUGS.has(data.slug)) {
      throw new AppError(
        `Slug "${data.slug}" is reserved by a static public route and cannot be used for a CMS page`,
        400
      );
    }
    const existing = await this.pageRepository.findBySlug(data.slug);
    if (existing) {
      throw new AppError('A page with this slug already exists', 409);
    }
    return this.pageRepository.create(data);
  }

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
    const existing = await this.pageRepository.findBySlug(slug);
    if (!existing) {
      throw new AppError('Page not found', 404);
    }
    return this.pageRepository.updateBySlug(slug, data);
  }

  async deletePage(slug: string): Promise<void> {
    const existing = await this.pageRepository.findBySlug(slug);
    if (!existing) {
      throw new AppError('Page not found', 404);
    }
    await this.pageRepository.deleteBySlug(slug);
  }
}
