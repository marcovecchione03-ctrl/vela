import { prisma } from "@/lib/db/prisma"

export async function getTenantCanonicalUrl(tenantId: string, path: string = ""): Promise<string> {
  const primaryDomain = await prisma.domain.findFirst({
    where: { tenantId, isPrimary: true, status: 'ACTIVE' }
  })

  const protocol = process.env.NODE_ENV === "production" ? "https://" : "http://"
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  if (primaryDomain) {
    return `${protocol}${primaryDomain.normalizedHostname}${cleanPath}`
  }

  // Safe platform fallback
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  const slug = tenant?.slug || tenantId
  
  const platformHost = process.env.NEXT_PUBLIC_APP_URL || "http://vela.localhost:3000"
  
  return `${platformHost}/${slug}${cleanPath}`
}
