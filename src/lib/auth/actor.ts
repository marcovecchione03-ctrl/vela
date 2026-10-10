import { prisma } from "@/lib/db/prisma"
import { requireAuthenticatedUser } from "@/lib/auth/rbac"
import type { Role } from "@prisma/client"

export type TenantActor = {
  userId: string
  membershipId: string
  role: Role
  /** EmployeeProfile id for staff, CustomerProfile id for customers. */
  profileId: string | null
}

/**
 * Resolves the acting user from the server session (never from client input).
 *
 * Server actions are public HTTP endpoints, so a `userId` argument coming from
 * the browser is untrusted. If one is supplied it must match the session user;
 * otherwise the call is rejected.
 */
export async function requireTenantActor(tenantId: string, claimedUserId?: string): Promise<TenantActor> {
  const userId = await requireAuthenticatedUser()
  if (claimedUserId !== undefined && claimedUserId !== userId) {
    throw new Error("Unauthorized")
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    include: { employeeProfile: true, customerProfile: true },
  })
  if (!membership) throw new Error("Unauthorized access to tenant")

  const profileId =
    membership.role === "CUSTOMER" ? membership.customerProfile?.id : membership.employeeProfile?.id

  return {
    userId,
    membershipId: membership.id,
    role: membership.role,
    profileId: profileId || null,
  }
}
