import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { redirect } from "next/navigation"
import { DomainsClient } from "./domains-client"

export default async function DomainsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/auth/login")

  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id, role: "OWNER" },
    include: { tenant: true }
  })

  if (!membership) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p>Only the Owner can manage custom domains.</p>
      </div>
    )
  }

  const tenant = membership.tenant
  const domains = await prisma.domain.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Custom Domains</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage custom domains for your booking page.</p>
      </div>
      <DomainsClient tenantId={tenant.id} initialDomains={domains} />
    </div>
  )
}
