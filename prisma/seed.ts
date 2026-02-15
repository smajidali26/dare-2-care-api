import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Database Seeder
 * Seeds the database with initial data
 */

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Hash the default admin password
  const SALT_ROUNDS = 10;
  const hashedPassword = await bcrypt.hash('Admin123!', SALT_ROUNDS);

  // Create default admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dare2care.org' },
    update: {},
    create: {
      email: 'admin@dare2care.org',
      passwordHash: hashedPassword,
      fullName: 'System Administrator',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log('Created admin user:', {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });

  // Seed default CMS pages
  const aboutPage = await prisma.page.upsert({
    where: { slug: 'about-us' },
    update: {},
    create: {
      slug: 'about-us',
      title: 'About Dare2Care',
      content: '<h2>Our Mission</h2><p>Dare2Care is dedicated to empowering communities through education and support. We believe in creating opportunities that transform lives and build brighter futures for those in need.</p><h2>What We Do</h2><p>Through our programs, we provide educational resources, support teachers, organize community events, and create mentorship opportunities that connect students with positive role models.</p>',
      metaDescription: 'Learn about Dare2Care and our mission to empower communities through education.',
      isPublished: true,
    },
  });

  console.log('Created about page:', { id: aboutPage.id, slug: aboutPage.slug });

  const historyPage = await prisma.page.upsert({
    where: { slug: 'history' },
    update: {},
    create: {
      slug: 'history',
      title: 'Our History',
      content: '<h2>Our Journey</h2><p>The story of Dare2Care began with a simple vision: to make quality education accessible to every child, regardless of their background. Over the years, we have grown from a small community initiative into an organization that touches the lives of hundreds of families.</p>',
      metaDescription: 'The history and journey of Dare2Care.',
      isPublished: true,
    },
  });

  console.log('Created history page:', { id: historyPage.id, slug: historyPage.slug });

  console.log('Database seed completed successfully!');
}

main()
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
