const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyDatabase() {
  try {
    console.log("Verifying database records...\n");
    
    const userCount = await prisma.user.count({ where: { isDeleted: false } });
    console.log(`Active Users: ${userCount}`);
    
    const subscriberCount = await prisma.subscriber.count({ where: { isDeleted: false } });
    console.log(`Active Subscribers: ${subscriberCount}`);
    
    const studentCount = await prisma.student.count({ where: { isDeleted: false } });
    console.log(`Active Students: ${studentCount}`);
    
    const teacherCount = await prisma.teacher.count({ where: { isDeleted: false } });
    console.log(`Active Teachers: ${teacherCount}`);
    
    const eventCount = await prisma.event.count({ where: { isDeleted: false } });
    console.log(`Active Events: ${eventCount}`);
    
    const publishedEventCount = await prisma.event.count({ 
      where: { isDeleted: false, isPublished: true } 
    });
    console.log(`Published Events: ${publishedEventCount}`);
    
    const contactCount = await prisma.contactSubmission.count();
    console.log(`Contact Submissions: ${contactCount}`);
    
    console.log("\nDatabase verification complete.");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();
