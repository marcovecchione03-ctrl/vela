import { prisma } from "@/lib/db/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { redirect } from "next/navigation"
import { TeamList } from "./TeamList"

export const metadata = {
  title: "Team | Vela",
}

export default async function TeamPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/auth/login")

  const tenantMembership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id },
    include: { tenant: true }
  })

  if (!tenantMembership) redirect("/onboarding")

  const tenantId = tenantMembership.tenantId

  // Fetch employees
  const employees = await prisma.employeeProfile.findMany({
    where: { tenantId },
    include: {
      tenantMembership: true,
      locations: {
        include: { location: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  // Fetch pending invitations
  const pendingInvitations = await prisma.teamInvitation.findMany({
    where: {
      tenantId,
      status: "PENDING",
      expiresAt: { gt: new Date() }
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">Manage your employees, admins, and their permissions.</p>
      </div>
      
      <TeamList 
        employees={employees} 
        pendingInvitations={pendingInvitations} 
        currentUserRole={tenantMembership.role} 
      />
    </div>
  )
}
