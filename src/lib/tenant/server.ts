import { headers } from "next/headers"
import { prisma } from "@/lib/db/prisma"
import { normalizeRequestHost } from "@/lib/tenant/domain"

export async function resolveTenantFromHost(expectedSlugOrId?: string) {
  const headersList = await headers()
  const hostHeader = headersList.get('x-vela-host')
  
  if (!hostHeader) return null

  const hostname = normalizeRequestHost(hostHeader)

  // Dev/apex bypass
  const isApex = hostname === 'vela.localhost' || hostname === 'localhost:3000' || hostname === 'vela.app'
  
  if (isApex) {
    if (expectedSlugOrId) {
      // In apex/dev mode, we allow path-based resolution for simplicity,
      // as long as they access via the platform domain.
      let tenant = await prisma.tenant.findUnique({ where: { slug: expectedSlugOrId } })
      if (!tenant && expectedSlugOrId.length === 36) {
        tenant = await prisma.tenant.findUnique({ where: { id: expectedSlugOrId } })
      }
      return tenant
    }
    return null
  }

  // Lookup domain
  const domain = await prisma.domain.findUnique({
    where: { normalizedHostname: hostname },
    include: { tenant: true }
  })

  // Security: only allow ACTIVE domains to serve traffic
  if (domain && domain.status === 'ACTIVE') {
    // If the path asks for a specific slug, make sure it matches the tenant we resolved
    // This prevents hitting customdomain.com/some-other-tenant
    if (expectedSlugOrId && domain.tenant.slug !== expectedSlugOrId && domain.tenant.id !== expectedSlugOrId) {
      return null
    }
    return domain.tenant
  }

  return null
}
