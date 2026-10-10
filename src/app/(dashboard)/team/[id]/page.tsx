import { prisma } from "@/lib/db/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { redirect } from "next/navigation"
import { EmployeeTabs } from "./EmployeeTabs"

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/auth/login")

  const tenantMembership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id },
    include: { tenant: true }
  })

  if (!tenantMembership) redirect("/onboarding")
  const tenantId = tenantMembership.tenantId

  const employee = await prisma.employeeProfile.findUnique({
    where: { id: id, tenantId },
    include: {
      tenantMembership: true,
      locations: true,
      services: true,
      availabilityRules: true,
      availabilityRequests: { orderBy: { createdAt: "desc" } }
    }
  })

  if (!employee) {
    return <div>Employee not found</div>
  }

  const allLocations = await prisma.location.findMany({ where: { tenantId } })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{employee.name} {employee.surname}</h1>
        <p className="text-muted-foreground">{employee.tenantMembership.role}</p>
      </div>

      <EmployeeTabs 
        employee={employee} 
        locations={allLocations}
        currentUserRole={tenantMembership.role}
      />
    </div>
  )
}
