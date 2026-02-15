import { Page } from '@prisma/client';
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

  async upsertBySlug(
    slug: string,
    data: {
      title: string;
      content: string;
      metaDescription?: string | null;
      isPublished?: boolean;
    }
  ): Promise<Page> {
    return prisma.page.upsert({
      where: { slug },
      update: {
        title: data.title,
        content: data.content,
        metaDescription: data.metaDescription,
        isPublished: data.isPublished,
      },
      create: {
        slug,
        title: data.title,
        content: data.content,
        metaDescription: data.metaDescription,
        isPublished: data.isPublished ?? true,
      },
    });
  }

  async update(
    id: string,
    data: Partial<Omit<Page, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Page> {
    return prisma.page.update({ where: { id }, data });
  }
}
