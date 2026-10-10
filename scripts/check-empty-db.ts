import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';
    `;
    
    if (result.length === 0) {
      console.log('DATABASE IS EMPTY');
      process.exit(0);
    } else {
      console.log('DATABASE IS NOT EMPTY. Found tables:');
      result.forEach(row => console.log(row.tablename));
      process.exit(1);
    }
  } catch (err: any) {
    console.error('CONNECTION FAILED:');
    console.error(err.message.replace(/postgres:\/\/[^:]+:[^@]+@/g, 'postgres://***:***@'));
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
}

main();
