import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

/**
 * Returns the currently authenticated user's ID, or throws an error.
 */
export async function requireAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

/**
 * Returns true if the current session is an impersonation session.
 */
export async function isImpersonating() {
  const session = await getServerSession(authOptions);
  return !!session?.user?.actualUserId;
}

/**
 * Throws if the user is currently impersonating.
 * Useful for blocking sensitive actions like modifying billing or deleting accounts.
 */
export async function requireNotImpersonating() {
  if (await isImpersonating()) {
    throw new Error("Forbidden: Action not allowed while impersonating");
  }
}

/**
 * Resolves the user's membership for a specific tenant.
 * Throws if the user does not belong to the tenant.
 */
export async function requireTenantMembership(tenantId: string) {
  const userId = await requireAuthenticatedUser();

  const membership = await prisma.tenantMembership.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
    select: {
      role: true,
      id: true,
    }
  });

  if (!membership) {
    throw new Error("Forbidden: Not a member of this tenant");
  }

  return membership;
}

/**
 * Enforces that the user has one of the allowed roles within the given tenant.
 */
export async function requireRole(tenantId: string, allowedRoles: string[]) {
  const membership = await requireTenantMembership(tenantId);

  if (!allowedRoles.includes(membership.role)) {
    throw new Error(`Forbidden: Requires one of roles [${allowedRoles.join(", ")}]`);
  }

  return membership;
}

/**
 * Shorthand for OWNER or ADMIN level access.
 */
export async function requireOwnerOrAdmin(tenantId: string) {
  return requireRole(tenantId, ["OWNER", "ADMIN"]);
}

/**
 * Shorthand for OWNER level access.
 */
export async function requireOwner(tenantId: string) {
  return requireRole(tenantId, ["OWNER"]);
}

/**
 * Shorthand for EMPLOYEE access (plus ADMIN/OWNER).
 */
export async function requireEmployee(tenantId: string) {
  return requireRole(tenantId, ["OWNER", "ADMIN", "EMPLOYEE"]);
}

/**
 * Validates that an employee is accessing their own data (or is an Admin/Owner).
 */
export async function requireEmployeeSelf(tenantId: string, employeeId: string) {
  const membership = await requireEmployee(tenantId);
  
  if (membership.role === "OWNER" || membership.role === "ADMIN") {
    return true; // Admins can access any employee's data
  }

  // Fetch the employee profile linked to this membership
  const profile = await prisma.employeeProfile.findUnique({
    where: { tenantMembershipId: membership.id }
  });

  if (!profile || profile.id !== employeeId) {
    throw new Error("Forbidden: You can only access your own employee data");
  }

  return true;
}

/**
 * Validates that a customer is accessing their own data.
 */
export async function requireCustomerSelf(tenantId: string, customerId: string) {
  const membership = await requireRole(tenantId, ["CUSTOMER", "OWNER", "ADMIN"]);
  
  if (membership.role === "OWNER" || membership.role === "ADMIN") {
    return true; 
  }

  const profile = await prisma.customerProfile.findUnique({
    where: { tenantMembershipId: membership.id }
  });

  if (!profile || profile.id !== customerId) {
    throw new Error("Forbidden: You can only access your own customer data");
  }

  return true;
}

/**
 * Platform level Super Admin check. 
 * Completely independent of TenantMembership.
 */
export async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.actualUserId || session?.user?.id;
  
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true }
  });

  if (!user?.isSuperAdmin) {
    throw new Error("Forbidden: Platform administrator only");
  }

  return true;
}
