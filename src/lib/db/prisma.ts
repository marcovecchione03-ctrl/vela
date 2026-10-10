import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

// Instantiate the base Prisma client
const basePrisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = basePrisma

/**
 * Creates a tenant-scoped Prisma client using Client Extensions.
 * 
 * SECURITY WARNING - WHAT THIS PROTECTS:
 * - Automatically injects `WHERE tenantId = ...` into standard CRUD operations (`findMany`, `update`, etc.)
 * - Automatically injects `tenantId: ...` into `create` operations.
 * 
 * SECURITY WARNING - WHAT THIS DOES NOT PROTECT:
 * - Does NOT protect `$queryRaw`, `$executeRaw`, or `$executeRawUnsafe`.
 * - Does NOT prevent nested `connect` attacks if a malicious ID is supplied, because Prisma processes 
 *   nested writes directly by their ID if no other condition is applied.
 * - Does NOT modify non-tenant models (User, Subscription, Domain).
 * 
 * You MUST still use the Data Access Objects (DAOs) and explicitly enforce tenant authorization limits.
 * This extension serves ONLY as a Defense in Depth safety net, not the primary security boundary.
 */
export const getTenantPrisma = (tenantId: string) => {
  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: { model: string, operation: string, args: Record<string, unknown>, query: (args: unknown) => Promise<unknown> }) {
          // List of models that do NOT have a tenantId and should not be filtered.
          const globalModels = [
            'User',
            'Subscription',
            'Tenant', // Tenant itself is global (though you could restrict it to its own id)
            'Domain',
            'Notification'
          ]

          // If the model is tenant-scoped, forcefully inject tenantId into the where clause
          if (!globalModels.includes(model)) {
            args.where = {
              ...(args.where || {}),
              tenantId,
            }
            
            // For create operations, ensure tenantId is in the data
            if (operation === 'create' || operation === 'createMany') {
               if (args.data) {
                 if (Array.isArray(args.data)) {
                   args.data = (args.data as Record<string, unknown>[]).map((item: Record<string, unknown>) => ({ ...item, tenantId }))
                 } else {
                   args.data = { ...args.data, tenantId }
                 }
               }
            }
          }

          return query(args)
        },
      },
    },
  })
}

// Export the base client for platform-level (Super Admin) or Edge resolution operations
export const prisma = basePrisma
