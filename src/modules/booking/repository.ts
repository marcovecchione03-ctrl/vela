import { getTenantPrisma } from "@/lib/db/prisma";

export class BookingRepository {
  static async getBookingsForLocation(tenantId: string, locationId: string) {
    const db = getTenantPrisma(tenantId);

    // The extension ensures tenant isolation
    return await db.booking.findMany({
      where: { locationId },
      include: {
        customer: true,
        employee: true,
        services: true
      },
      orderBy: { startTime: 'asc' }
    });
  }
}
