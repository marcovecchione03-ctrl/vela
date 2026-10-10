import { getTenantPrisma } from "@/lib/db/prisma";

export class CustomerRepository {
  /**
   * We pass the tenantId to the factory.
   * This gives us a Prisma client that is ALREADY scoped to this tenant via the extension.
   * But as an extra layer of defense, we can also explicitly type our DAOs to require it,
   * or rely on the extension to catch mistakes.
   */
  static async getCustomers(tenantId: string) {
    const db = getTenantPrisma(tenantId);
    
    // The extension will automatically add `where: { tenantId }`
    return await db.customerProfile.findMany({
      orderBy: { lastName: 'asc' }
    });
  }

  static async getCustomerById(tenantId: string, customerId: string) {
    const db = getTenantPrisma(tenantId);
    
    // Even if we just search by id, the extension adds `{ tenantId }` ensuring
    // we can't accidentally fetch a customer from another tenant.
    return await db.customerProfile.findUnique({
      where: { id: customerId }
    });
  }

  static async createCustomer(tenantId: string, data: { firstName: string; lastName: string; tenantMembershipId: string }) {
    const db = getTenantPrisma(tenantId);

    // The extension will inject tenantId, but passing it explicitly here 
    // is good practice for TypeScript validation.
    return await db.customerProfile.create({
      data: {
        ...data,
        tenantId,
      }
    });
  }
}
