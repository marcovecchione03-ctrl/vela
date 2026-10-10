import { prisma } from "@/lib/db/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { redirect } from "next/navigation"
import { ServicesList } from "./ServicesList"

export const metadata = {
  title: "Services | Vela",
}

export default async function ServicesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/auth/login")

  const tenantMembership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id },
    include: { tenant: true }
  })

  if (!tenantMembership) redirect("/onboarding")
  const tenantId = tenantMembership.tenantId

  const categories = await prisma.serviceCategory.findMany({
    where: { tenantId },
    include: {
      services: {
        include: {
          locations: { include: { location: true } },
          employees: { include: { employee: true } }
        }
      }
    },
    orderBy: { orderIndex: 'asc' }
  })

  const allLocations = await prisma.location.findMany({ where: { tenantId } })
  const allEmployees = await prisma.employeeProfile.findMany({ 
    where: { tenantId, isActive: true } 
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Services & Categories</h1>
        <p className="text-muted-foreground">Manage your offerings and pricing.</p>
      </div>

      <ServicesList 
        categories={categories} 
        allLocations={allLocations}
        allEmployees={allEmployees}
        currentUserRole={tenantMembership.role} 
      />
    </div>
  )
}
