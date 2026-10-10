import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Attempt a completely harmless read
    const userCount = await prisma.user.count();
    const tenantCount = await prisma.tenant.count();
    
    console.log(`✅ Database connection successful.`);
    console.log(`✅ Users table accessible: ${userCount} users found.`);
    console.log(`✅ Tenants table accessible: ${tenantCount} tenants found.`);
    
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Database smoke check failed.");
    console.error(error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
