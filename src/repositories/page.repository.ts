import { Page, Prisma } from '@prisma/client';
import prisma from '../config/database.config';

/** Menu-related page fields, as accepted on create and update. */
export interface PageMenuFields {
  parentId?: string | null;
  menuLabel?: string | null;
  menuHeading?: string | null;
  menuOrder?: number;
}

/** What the website needs to build its menu: no content. */
export type MenuPage = Pick<
  Page,
  'id' | 'slug' | 'title' | 'parentId' | 'menuLabel' | 'menuHeading' | 'menuOrder'
>;

/** A page's place in the page tree. */
export type PageTreeNode = Pick<Page, 'id' | 'parentId' | 'title'>;

export class PageRepository {
  async findBySlug(slug: string): Promise<Page | null> {
    return prisma.page.findUnique({ where: { slug } });
  }

  async findById(id: string): Promise<Page | null> {
    return prisma.page.findUnique({ where: { id } });
  }

  async findAll(): Promise<Page[]> {
    return prisma.page.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  /** Published pages, in menu order, with only the fields the menu uses. */
  async findMenuPages(): Promise<MenuPage[]> {
    return prisma.page.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        slug: true,
        title: true,
        parentId: true,
        menuLabel: true,
        menuHeading: true,
        menuOrder: true,
      },
      orderBy: [{ menuOrder: 'asc' }, { title: 'asc' }],
    });
  }

  /** Every page (drafts too) with just its parent, to check where a page may go. */
  async findTreeNodes(): Promise<PageTreeNode[]> {
    return prisma.page.findMany({ select: { id: true, parentId: true, title: true } });
  }

  async countChildren(id: string): Promise<number> {
    return prisma.page.count({ where: { parentId: id } });
  }

  async create(
    data: {
      slug: string;
      title: string;
      content: string;
      metaDescription?: string | null;
      isPublished?: boolean;
    } & PageMenuFields
  ): Promise<Page> {
    return prisma.page.create({
      data: {
        slug: data.slug,
        title: data.title,
        content: data.content,
        metaDescription: data.metaDescription,
        isPublished: data.isPublished ?? true,
        parentId: data.parentId ?? null,
        menuLabel: data.menuLabel ?? null,
        menuHeading: data.menuHeading ?? null,
        menuOrder: data.menuOrder ?? 0,
      },
    });
  }

  async updateBySlug(
    slug: string,
    data: {
      title?: string;
      content?: string;
      metaDescription?: string | null;
      isPublished?: boolean;
    } & PageMenuFields
  ): Promise<Page> {
    // Only forward keys the caller actually sent, so a partial update (e.g.
    // `{ isPublished: false }`) doesn't null out the title, content or meta
    // description that weren't part of the request.
    const updateData: Prisma.PageUncheckedUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;
    if (data.menuLabel !== undefined) updateData.menuLabel = data.menuLabel;
    if (data.menuHeading !== undefined) updateData.menuHeading = data.menuHeading;
    if (data.menuOrder !== undefined) updateData.menuOrder = data.menuOrder;

    return prisma.page.update({
      where: { slug },
      data: updateData,
    });
  }

  async update(
    id: string,
    data: Partial<Omit<Page, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Page> {
    return prisma.page.update({ where: { id }, data });
  }

  async deleteBySlug(slug: string): Promise<Page> {
    return prisma.page.delete({ where: { slug } });
  }
}
