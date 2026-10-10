"use server"

import { z } from "zod"
import { prisma } from "@/lib/db/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { randomBytes, createHash } from "crypto"
import { Role, InvitationStatus } from "@prisma/client"
// We can extract an auth helper to ensure dry code.
async function getAuthAndTenant() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const tenantMembership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id },
    include: { tenant: true }
  })

  if (!tenantMembership) throw new Error("No tenant found")

  return { session, tenant: tenantMembership.tenant, membership: tenantMembership }
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role),
})

export async function inviteMember(data: z.infer<typeof inviteSchema>) {
  const { session, tenant, membership } = await getAuthAndTenant()

  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    throw new Error("Forbidden: insufficient permissions")
  }

  const parsed = inviteSchema.parse(data)

  // ADMIN cannot invite ADMIN
  if (membership.role === "ADMIN" && parsed.role === "ADMIN") {
    throw new Error("Admins cannot invite other Admins")
  }
  
  if (parsed.role === "OWNER" || parsed.role === "CUSTOMER") {
    throw new Error("Cannot invite this role via team invitations")
  }

  // Generate secure token
  const rawToken = randomBytes(32).toString("hex")
  const tokenHash = createHash("sha256").update(rawToken).digest("hex")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const invite = await prisma.teamInvitation.create({
    data: {
      tenantId: tenant.id,
      email: parsed.email,
      role: parsed.role,
      inviterUserId: session.user.id,
      tokenHash,
      expiresAt,
    }
  })

  // Audit Log
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorId: session.user.id,
      action: "INVITATION_CREATED",
      entityType: "TeamInvitation",
      entityId: invite.id,
      metadata: JSON.stringify({ role: parsed.role, email: parsed.email })
    }
  })

  // In production, we would send an email here.
  // For development, we return the link.
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${rawToken}`

  return { success: true, inviteLink }
}

export async function revokeInvitation(invitationId: string) {
  const { session, tenant, membership } = await getAuthAndTenant()

  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    throw new Error("Forbidden")
  }

  const invite = await prisma.teamInvitation.findUnique({
    where: { id: invitationId, tenantId: tenant.id }
  })

  if (!invite) throw new Error("Invitation not found")

  if (membership.role === "ADMIN" && invite.role === "ADMIN") {
     throw new Error("Admins cannot revoke admin invitations")
  }

  await prisma.teamInvitation.update({
    where: { id: invitationId },
    data: { status: "REVOKED" }
  })

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorId: session.user.id,
      action: "INVITATION_REVOKED",
      entityType: "TeamInvitation",
      entityId: invite.id,
    }
  })

  return { success: true }
}

export async function acceptInvitation(rawToken: string, firstName: string, lastName: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Must be logged in to accept")

  const tokenHash = createHash("sha256").update(rawToken).digest("hex")

  return await prisma.$transaction(async (tx) => {
    const invite = await tx.teamInvitation.findUnique({
      where: { tokenHash }
    })

    if (!invite || invite.status !== "PENDING") {
      throw new Error("Invalid or expired invitation")
    }

    if (invite.expiresAt < new Date()) {
      await tx.teamInvitation.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" }
      })
      throw new Error("Invitation has expired")
    }

    if (session.user.email !== invite.email) {
      throw new Error("This invitation was sent to a different email address.")
    }

    // Check if user already has membership in this tenant
    const existing = await tx.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: invite.tenantId,
          userId: session.user.id
        }
      }
    })

    if (existing) {
       throw new Error("You are already a member of this tenant")
    }

    // Create Membership
    const membership = await tx.tenantMembership.create({
      data: {
        tenantId: invite.tenantId,
        userId: session.user.id,
        role: invite.role
      }
    })

    // Create Employee Profile
    const profile = await tx.employeeProfile.create({
      data: {
        tenantId: invite.tenantId,
        tenantMembershipId: membership.id,
        name: firstName,
        surname: lastName,
        isActive: true,
      }
    })

    // Mark as accepted
    await tx.teamInvitation.update({
      where: { id: invite.id },
      data: { 
        status: "ACCEPTED",
        acceptedAt: new Date()
      }
    })

    await tx.auditLog.create({
      data: {
        tenantId: invite.tenantId,
        actorId: session.user.id,
        action: "INVITATION_ACCEPTED",
        entityType: "TeamInvitation",
        entityId: invite.id,
        metadata: JSON.stringify({ role: invite.role })
      }
    })

    return { success: true }
  })
}
