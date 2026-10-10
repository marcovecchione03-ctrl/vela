import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const criticalTables = [
      'User', 'Tenant', 'TenantMembership', 'Location',
      'CustomerProfile', 'EmployeeProfile', 'Service',
      'Booking', 'BookingService', 'BookingStatusHistory',
      'OneTimeClient', 'Subscription', 'StripeWebhookEvent',
      'BillingCheckoutAttempt', 'Domain', 'ExternalCalendarConnection',
      'ExternalCalendarEvent', 'CalendarSyncJob', 'PushSubscription',
      'NotificationJob', 'PlatformSupportNote'
    ];

    const pgTables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `;
    const actualTables = pgTables.map(r => r.tablename);
    
    let allFound = true;
    for (const t of criticalTables) {
      if (actualTables.includes(t)) {
        console.log(`[PASS] Found table: ${t}`);
      } else {
        console.error(`[FAIL] Missing table: ${t}`);
        allFound = false;
      }
    }

    const uniqueConstraints = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname FROM pg_constraint WHERE contype = 'u';
    `;
    const fks = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname FROM pg_constraint WHERE contype = 'f';
    `;
    
    console.log(`[INFO] Found ${uniqueConstraints.length} unique constraints and ${fks.length} foreign keys.`);

  } finally {
    await prisma.$disconnect();
  }
}
main();
