import { Page, Prisma } from '@prisma/client';
import prisma from '../config/database.config';

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

  async create(data: {
    slug: string;
    title: string;
    content: string;
    metaDescription?: string | null;
    isPublished?: boolean;
  }): Promise<Page> {
    return prisma.page.create({
      data: {
        slug: data.slug,
        title: data.title,
        content: data.content,
        metaDescription: data.metaDescription,
        isPublished: data.isPublished ?? true,
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
    }
  ): Promise<Page> {
    // Only forward keys the caller actually sent, so a partial update (e.g.
    // `{ isPublished: false }`) doesn't null out the title, content or meta
    // description that weren't part of the request.
    const updateData: Prisma.PageUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;

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
