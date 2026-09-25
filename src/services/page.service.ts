import { MenuPage, PageMenuFields, PageRepository } from '../repositories/page.repository';
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

/** Empty menu text means "use the title": store it as null. */
const menuText = (value: string | null | undefined): string | null | undefined =>
  value === undefined ? undefined : value?.trim() || null;

export class PageService {
  constructor(private pageRepository: PageRepository) {}

  /**
   * The menu is two levels deep: a sub page must hang off a top-level page,
   * and never off itself.
   */
  private async assertValidParent(parentId: string, pageId?: string): Promise<void> {
    if (parentId === pageId) {
      throw new AppError('A page cannot be its own parent', 400);
    }
    const parent = await this.pageRepository.findById(parentId);
    if (!parent) {
      throw new AppError('Parent page not found', 400);
    }
    if (parent.parentId) {
      throw new AppError(
        `"${parent.title}" is itself a sub page. Sub pages can only go under a top-level page.`,
        400
      );
    }
  }

  private normaliseMenuFields(data: PageMenuFields): PageMenuFields {
    return {
      parentId: data.parentId,
      menuLabel: menuText(data.menuLabel),
      menuHeading: menuText(data.menuHeading),
      menuOrder: data.menuOrder,
    };
  }

  async createPage(
    data: {
      slug: string;
      title: string;
      content: string;
      metaDescription?: string | null;
      isPublished?: boolean;
    } & PageMenuFields
  ): Promise<Page> {
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
    if (data.parentId) {
      await this.assertValidParent(data.parentId);
    }
    return this.pageRepository.create({ ...data, ...this.normaliseMenuFields(data) });
  }

  /** Published pages for the website menu. */
  async getMenuPages(): Promise<MenuPage[]> {
    return this.pageRepository.findMenuPages();
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
      title?: string;
      content?: string;
      metaDescription?: string | null;
      isPublished?: boolean;
    } & PageMenuFields
  ): Promise<Page> {
    const existing = await this.pageRepository.findBySlug(slug);
    if (!existing) {
      throw new AppError('Page not found', 404);
    }
    if (data.parentId) {
      await this.assertValidParent(data.parentId, existing.id);
      const children = await this.pageRepository.countChildren(existing.id);
      if (children > 0) {
        throw new AppError(
          'This page has sub pages, so it cannot become a sub page itself. Move its sub pages first.',
          400
        );
      }
    }
    return this.pageRepository.updateBySlug(slug, { ...data, ...this.normaliseMenuFields(data) });
  }

  async deletePage(slug: string): Promise<void> {
    const existing = await this.pageRepository.findBySlug(slug);
    if (!existing) {
      throw new AppError('Page not found', 404);
    }
    // Deleting a parent would silently promote its sub pages into the main
    // menu, so ask for them to be moved or deleted first.
    const children = await this.pageRepository.countChildren(existing.id);
    if (children > 0) {
      throw new AppError(
        `This page has ${children} sub page${children === 1 ? '' : 's'}. Move or delete ${children === 1 ? 'it' : 'them'} first.`,
        409
      );
    }
    await this.pageRepository.deleteBySlug(slug);
  }
}
