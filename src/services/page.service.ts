import {
  MenuPage,
  PageMenuFields,
  PageRepository,
  PageTreeNode,
} from '../repositories/page.repository';
import { Page } from '@prisma/client';
import { AppError } from '../utils/AppError';

/**
 * How many levels the website menu has: top-level pages, their sub pages, and
 * the sub pages of those (About › Our History › …). The admin portal and the
 * website have the same limit (MAX_MENU_DEPTH); keep them in step.
 */
export const MAX_MENU_DEPTH = 3;

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
   * A page can go under any other page, as long as neither it nor its own sub
   * pages end up deeper than MAX_MENU_DEPTH, and it doesn't go under one of
   * its own sub pages. `pageId` is the page being moved (absent on create).
   */
  private async assertValidParent(parentId: string, pageId?: string): Promise<void> {
    if (parentId === pageId) {
      throw new AppError('A page cannot be its own parent', 400);
    }
    const nodes = await this.pageRepository.findTreeNodes();
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const parent = byId.get(parentId);
    if (!parent) {
      throw new AppError('Parent page not found', 400);
    }

    // The parent's level in the menu (1 = top level), walking up its parents.
    let parentLevel = 0;
    let node: PageTreeNode | undefined = parent;
    while (node && parentLevel <= nodes.length) {
      if (node.id === pageId) {
        throw new AppError('A page cannot go under one of its own sub pages', 400);
      }
      parentLevel += 1;
      node = node.parentId ? byId.get(node.parentId) : undefined;
    }
    if (parentLevel >= MAX_MENU_DEPTH) {
      throw new AppError(
        `"${parent.title}" is on the last menu level, so it can't have sub pages. The menu is ${MAX_MENU_DEPTH} levels deep.`,
        400
      );
    }

    // Levels the page takes up itself: 1, plus however deep its sub pages go.
    const levels = (id: string, seen: Set<string>): number => {
      if (seen.has(id)) return 0;
      seen.add(id);
      const children = nodes.filter((child) => child.parentId === id);
      return 1 + Math.max(0, ...children.map((child) => levels(child.id, seen)));
    };
    if (pageId && parentLevel + levels(pageId, new Set()) > MAX_MENU_DEPTH) {
      throw new AppError(
        `Under "${parent.title}", this page's sub pages would be more than ${MAX_MENU_DEPTH} menu levels deep. Move them first.`,
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
