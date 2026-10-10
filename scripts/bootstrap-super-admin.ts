import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/bootstrap-super-admin.ts <user_email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.error(`User with email ${email} not found.`);
    process.exit(1);
  }

  if (user.isSuperAdmin) {
    console.log(`User ${email} is already a Super Admin.`);
    process.exit(0);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isSuperAdmin: true }
  });

  console.log(`User ${email} has been successfully promoted to Super Admin.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
