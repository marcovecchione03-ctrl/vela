import { requireRole } from "@/lib/auth/rbac"
import { prisma } from "@/lib/db/prisma"
import { getDashboardTenant } from "@/lib/tenant/context"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell"
import { validateCustomRange, classifyNewVsReturning } from "@/lib/logic/analytics"

export default async function AnalyticsPage({
  searchParams
}: {
  searchParams: Promise<{ range?: string; start?: string; end?: string }>
}) {
  const resolvedSearchParams = await searchParams;
  const tenant = await getDashboardTenant()
  if (!tenant) notFound()

  // Strict RBAC: Only OWNER and ADMIN
  const { role } = await requireRole(tenant.id, ["OWNER", "ADMIN"])

  const range = resolvedSearchParams.range || "30d" // 7d, 30d, 3m, 12m, custom
  
  const now = new Date()
  let startDate = new Date()
  let endDate = new Date()

  if (range === "custom") {
    const startStr = resolvedSearchParams.start || ""
    const endStr = resolvedSearchParams.end || ""
    const custom = validateCustomRange(startStr, endStr)
    startDate = custom.startDate
    endDate = custom.endDate
  } else {
    if (range === "7d") startDate.setDate(now.getDate() - 7)
    else if (range === "30d") startDate.setDate(now.getDate() - 30)
    else if (range === "3m") startDate.setMonth(now.getMonth() - 3)
    else if (range === "12m") startDate.setFullYear(now.getFullYear() - 1)
    else startDate.setDate(now.getDate() - 30) // fallback
  }

  const bookings = await prisma.booking.findMany({
    where: {
      tenantId: tenant.id,
      startTime: { gte: startDate, lte: endDate }
    },
    include: { services: true, employee: true }
  })

  const total = bookings.length
  const completed = bookings.filter(b => b.status === "COMPLETED").length
  const cancelled = bookings.filter(b => b.status === "CANCELLED").length
  const noShows = bookings.filter(b => b.status === "NO_SHOW").length

  const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0
  const cancellationRate = total > 0 ? ((cancelled / total) * 100).toFixed(1) : 0
  const finalizedDenominator = completed + noShows
  const noShowRate = finalizedDenominator > 0 ? ((noShows / finalizedDenominator) * 100).toFixed(1) : 0

  // Revenue (using completed only)
  let totalRevenue = 0
  const servicePopularity: Record<string, { count: number, name: string }> = {}
  const employeePopularity: Record<string, { count: number, name: string }> = {}
  const uniqueCustomersInPeriod = new Set<string>()

  bookings.forEach(b => {
    if (b.customerId) uniqueCustomersInPeriod.add(b.customerId)
    
    if (b.status !== "CANCELLED") {
      if (b.employee) {
        employeePopularity[b.employeeId] = {
          count: (employeePopularity[b.employeeId]?.count || 0) + 1,
          name: b.employee.name + " " + (b.employee.surname || "")
        }
      }
    }

    if (b.status === "COMPLETED") {
      b.services.forEach(s => {
        totalRevenue += (s.price || 0)
        servicePopularity[s.serviceId] = {
          count: (servicePopularity[s.serviceId]?.count || 0) + 1,
          name: s.serviceName
        }
      })
    }
  })

  const topServices = Object.values(servicePopularity).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.name.localeCompare(b.name)
  }).slice(0, 5)
  
  const topEmployees = Object.values(employeePopularity).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.name.localeCompare(b.name)
  }).slice(0, 5)

  // New vs Returning calculation
  let newCustomersCount = 0
  let returningCustomersCount = 0

  const customerIdsArray = Array.from(uniqueCustomersInPeriod)
  if (customerIdsArray.length > 0) {
    const earliestBookings = await prisma.booking.groupBy({
      by: ['customerId'],
      where: {
        tenantId: tenant.id,
        customerId: { in: customerIdsArray }
      },
      _min: {
        startTime: true
      }
    })

    const earliestBookingMap: Record<string, Date> = {}
    for (const group of earliestBookings) {
      if (group._min.startTime && group.customerId) {
        earliestBookingMap[group.customerId] = group._min.startTime
      }
    }

    const res = classifyNewVsReturning(customerIdsArray, earliestBookingMap, startDate)
    newCustomersCount = res.newCustomers
    returningCustomersCount = res.returningCustomers
  }

  return (
    <DashboardPageShell variant="wide" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-gray-500">Business performance metrics.</p>
        </div>
        <div className="flex gap-2">
          {["7d", "30d", "3m", "12m"].map(r => (
            <Link 
              key={r} 
              href={`/dashboard/analytics?range=${r}`}
              className={`px-3 py-1 rounded text-sm ${range === r ? 'bg-black text-white' : 'bg-gray-200 text-gray-800'}`}
            >
              {r.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue (Completed)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">{(totalRevenue / 100).toFixed(2)} €</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cancellation Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-yellow-600">{cancellationRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>No-Show Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-600">{noShowRate}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topServices.map((s, i) => (
                <div key={i} className="flex justify-between items-center border-b pb-2">
                  <span className="font-medium">{s.name}</span>
                  <span className="bg-gray-100 px-2 py-1 rounded text-sm">{s.count} bookings</span>
                </div>
              ))}
              {topServices.length === 0 && <p className="text-sm text-gray-500">No completed services in this period.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topEmployees.map((s, i) => (
                <div key={i} className="flex justify-between items-center border-b pb-2">
                  <span className="font-medium">{s.name}</span>
                  <span className="bg-gray-100 px-2 py-1 rounded text-sm">{s.count} bookings</span>
                </div>
              ))}
              {topEmployees.length === 0 && <p className="text-sm text-gray-500">No employees with bookings in this period.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status & Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span>Completed</span>
                <span className="font-bold">{completed}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Cancelled</span>
                <span className="font-bold">{cancelled}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>No-Shows</span>
                <span className="font-bold">{noShows}</span>
              </div>
              <hr />
              <div className="flex justify-between items-center text-sm">
                <span>New Customers</span>
                <span className="font-bold text-green-600">{newCustomersCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Returning Customers</span>
                <span className="font-bold text-blue-600">{returningCustomersCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardPageShell>
  )
}
