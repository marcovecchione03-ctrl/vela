import { prisma } from "@/lib/db/prisma"
import { notFound } from "next/navigation"
import { resolveTenantFromHost } from "@/lib/tenant/server"

export default async function TenantHomepage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  
  const baseTenant = await resolveTenantFromHost(domain)
  if (!baseTenant) notFound()

  // We need services and locations, so we fetch again or we just fetch by ID here securely
  const tenant = await prisma.tenant.findUnique({
    where: { id: baseTenant.id },
    include: {
      locations: true,
      services: {
        where: { isActive: true },
        include: { category: true }
      }
    }
  })

  if (!tenant) notFound()

  if (tenant.status === "SUSPENDED") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Temporarily Unavailable</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          This booking page is currently suspended. If you are the owner, please sign in and navigate to your dashboard to update your billing information.
        </p>
        <a href={`/dashboard/subscription`} className="px-4 py-2 bg-gray-900 text-white rounded-md font-medium">
          Manage Subscription
        </a>
      </div>
    )
  }

  // Group services by category
  const categoriesMap = new Map<string, any>()
  tenant.services.forEach(svc => {
    if (svc.category) {
      if (!categoriesMap.has(svc.category.id)) {
        categoriesMap.set(svc.category.id, { ...svc.category, services: [] })
      }
      categoriesMap.get(svc.category.id).services.push(svc)
    }
  })
  
  const sortedCategories = Array.from(categoriesMap.values()).sort((a, b) => a.orderIndex - b.orderIndex)

  return (
    <div className="space-y-12">
      <section className="text-center py-12 bg-white rounded-2xl shadow-sm border">
        <h2 className="text-4xl font-bold mb-4">Welcome to {tenant.name}</h2>
        <p className="text-lg text-muted-foreground mb-8">Book your next appointment online</p>
        <a 
          href={`/${domain}/book`}
          className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          Book Now
        </a>
      </section>

      <section>
        <h3 className="text-2xl font-bold mb-6">Our Services</h3>
        {sortedCategories.length === 0 ? (
          <p className="text-muted-foreground">No services available currently.</p>
        ) : (
          <div className="space-y-8">
            {sortedCategories.map(cat => (
              <div key={cat.id}>
                <h4 className="text-xl font-semibold mb-4 border-b pb-2">{cat.name}</h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.services.map((svc: any) => (
                    <div key={svc.id} className="p-4 border rounded-lg bg-white shadow-sm flex flex-col justify-between">
                      <div>
                        <h5 className="font-semibold text-lg">{svc.name}</h5>
                        <p className="text-muted-foreground text-sm">{svc.durationMinutes} minutes</p>
                      </div>
                      {tenant?.showPrices && (
                        <p className="font-medium mt-4 pt-4 border-t border-gray-100">
                          {svc.priceMode === "STARTING_FROM" ? "Da " : ""}€{(svc.price / 100).toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      
      <section>
        <h3 className="text-2xl font-bold mb-6">Locations</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {tenant.locations.map(loc => (
            <div key={loc.id} className="p-4 border rounded-lg bg-white shadow-sm">
              <h4 className="font-bold">{loc.name}</h4>
              {loc.address && <p className="text-muted-foreground text-sm">{loc.address}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
