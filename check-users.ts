import prisma from './src/config/database.config';

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
      take: 10,
    });

    console.log('\n📊 Current Users in Database:');
    console.log('================================');

    if (users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('\nYou need to create an admin user. Run: npm run prisma:seed');
    } else {
      console.log(`✅ Found ${users.length} user(s):\n`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive}`);
        console.log(`   ID: ${user.id}\n`);
      });
    }
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
