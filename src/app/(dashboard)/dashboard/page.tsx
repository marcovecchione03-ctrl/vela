import { requireRole } from "@/lib/auth/rbac"
import { prisma } from "@/lib/db/prisma"
import { getDashboardTenant } from "@/lib/tenant/context"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function DashboardHomePage() {
  const tenant = await getDashboardTenant()
  if (!tenant) notFound()

  // Strict RBAC: All staff can see dashboard, but metrics differ by role
  const membership = await requireRole(tenant.id, ["OWNER", "ADMIN", "EMPLOYEE"])
  const role = membership.role
  
  // Find employee profile if needed for filtering
  const employeeProfile = await prisma.employeeProfile.findUnique({
    where: { tenantMembershipId: membership.id }
  })
  const profileId = employeeProfile?.id

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const whereClause: any = {
    tenantId: tenant.id,
    startTime: {
      gte: todayStart,
      lte: todayEnd
    }
  }

  // Employees only see their own stats
  if (role === "EMPLOYEE") {
    whereClause.employeeId = profileId
  }

  const todayBookings = await prisma.booking.findMany({
    where: whereClause,
    include: { services: true }
  })

  const completed = todayBookings.filter(b => b.status === "COMPLETED").length
  const pending = todayBookings.filter(b => b.status === "PENDING").length
  const cancelled = todayBookings.filter(b => b.status === "CANCELLED").length
  const noShows = todayBookings.filter(b => b.status === "NO_SHOW").length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Welcome back. Here is your overview for today.</p>
        </div>
        {(role === "OWNER" || role === "ADMIN") && (
          <Link href={`/dashboard/analytics`} className="bg-gray-800 text-white px-4 py-2 rounded shadow hover:bg-gray-700">
            Full Analytics
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Appointments Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{todayBookings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">{completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">{pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cancellations / No Shows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-600">{cancelled} / {noShows}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {todayBookings.length === 0 ? (
            <p className="text-gray-500 text-sm">No appointments scheduled for today.</p>
          ) : (
            <div className="space-y-2">
              {todayBookings.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()).map(b => (
                <div key={b.id} className="flex justify-between p-3 border rounded items-center">
                  <div>
                    <div className="font-semibold">{new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="text-sm text-gray-500">{b.services.map(s => s.serviceName).join(", ")}</div>
                  </div>
                  <div>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded font-medium">{b.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
