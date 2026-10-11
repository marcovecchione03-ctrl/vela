import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { MapPin, Plus } from "lucide-react"

import { getDashboardTenant } from "@/lib/tenant/context"
import { requireOwner } from "@/lib/auth/rbac"

export default async function LocationsPage() {
  const t = await getDashboardTenant()
  if (!t) redirect("/auth/login")

  try {
    await requireOwner(t.id)
  } catch (e) {
    redirect("/onboarding")
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: t.id },
    include: { locations: true, subscription: true }
  })
  
  if (!tenant) redirect("/onboarding")
  const maxLocations = tenant.subscription?.plan === "PRO" ? 3 : 1
  const currentCount = tenant.locations.length
  const canAdd = currentCount < maxLocations

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Locations</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage your business locations and opening hours.</p>
        </div>
        {canAdd ? (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        ) : (
          <Button disabled variant="outline" title={`Your ${tenant.subscription?.plan} plan allows up to ${maxLocations} location(s).`}>
            Plan limit reached ({maxLocations}/{maxLocations})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenant.locations.map(location => (
          <Card key={location.id} className="relative overflow-hidden">
            <CardHeader className="pb-4">
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5 text-neutral-600" />
              </div>
              <CardTitle className="text-lg">{location.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {location.address || "No address provided"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-neutral-500">
                <span className={location.isActive ? "text-green-600 font-medium" : "text-neutral-400"}>
                  {location.isActive ? "Active" : "Inactive"}
                </span>
                <span className="mx-2">•</span>
                <span>{location.timezone || "Europe/Rome"}</span>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" className="w-full">Manage</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
