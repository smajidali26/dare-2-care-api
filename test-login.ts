import prisma from './src/config/database.config';
import bcrypt from 'bcrypt';

async function testLogin() {
  try {
    const email = 'admin@dare2care.org';
    const password = 'Admin123!';

    console.log('🔍 Testing login for:', email);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });

    // Test password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    console.log('\n🔐 Password check:', isValidPassword ? '✅ VALID' : '❌ INVALID');

    if (!user.isActive) {
      console.log('⚠️  User is not active');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
