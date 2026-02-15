import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database.config';

export const getStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalUsers,
      totalSubscribers,
      activeEvents,
      totalStudents,
      totalTeachers,
      totalImages,
      unreadContacts,
    ] = await Promise.all([
      prisma.user.count({ where: { isDeleted: false } }),
      prisma.subscriber.count({ where: { isDeleted: false } }),
      prisma.event.count({ where: { isDeleted: false, isPublished: true } }),
      prisma.student.count({ where: { isDeleted: false } }),
      prisma.teacher.count({ where: { isDeleted: false } }),
      prisma.image.count({ where: { isDeleted: false } }),
      prisma.contactSubmission.count({ where: { isRead: false } }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalSubscribers,
        activeEvents,
        totalStudents,
        totalTeachers,
        totalImages,
        unreadContacts,
      },
    });
  } catch (error) {
    next(error);
  }
};
