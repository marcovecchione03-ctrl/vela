import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { redirect } from "next/navigation"
import { DomainsClient } from "./domains-client"

import { getDashboardTenant } from "@/lib/tenant/context"
import { requireOwner } from "@/lib/auth/rbac"

export default async function DomainsPage() {
  const tenant = await getDashboardTenant()
  if (!tenant) redirect("/auth/login")

  try {
    await requireOwner(tenant.id)
  } catch (e) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p>Only the Owner can manage custom domains.</p>
      </div>
    )
  }

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
