import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbStatus = 'unknown';
  
  try {
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
    await prisma.$disconnect();
  } catch (error) {
    dbStatus = 'disconnected';
    console.error('Health check DB error:', error);
  }

  return NextResponse.json({
    status: 'ok',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
}
