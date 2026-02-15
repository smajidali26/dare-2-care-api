import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton Pattern
 * Ensures only one instance of Prisma Client is created
 * and reused across the application lifecycle
 */

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });
};

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;

/**
 * Graceful shutdown handler for Prisma Client
 * Ensures database connections are properly closed
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('Database connection closed gracefully');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
    throw error;
  }
};
