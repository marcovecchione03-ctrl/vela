import { requireRole } from "@/lib/auth/rbac"
import { prisma } from "@/lib/db/prisma"
import { getDashboardTenant } from "@/lib/tenant/context"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getScoreBand } from "@/lib/crm/customer-score"
import Link from "next/link"

export default async function CustomerDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params;
  const tenant = await getDashboardTenant()
  if (!tenant) notFound()

  const { role } = await requireRole(tenant.id, ["OWNER", "ADMIN"])

  const customer = await prisma.customerProfile.findFirst({
    where: { id: resolvedParams.id, tenantId: tenant.id },
    include: {
      tenantMembership: { include: { user: true } },
      tags: { include: { tag: true } },
      customerNotes: { orderBy: { createdAt: "desc" }, include: { customer: true } },
      scoreEvents: { orderBy: { createdAt: "desc" }, take: 10 },
      bookings: { 
        orderBy: { startTime: "desc" }, 
        take: 10,
        include: { services: true, employee: true }
      }
    }
  })

  if (!customer) notFound()

  const scoreBand = getScoreBand(customer.score)

  const allBookings = await prisma.booking.findMany({
    where: { customerId: customer.id },
    include: { services: true, employee: true },
    orderBy: { startTime: "asc" }
  })

  let totalLTV = 0
  let completed = 0
  let canceled = 0
  let lateCanceled = 0
  let noShows = 0

  const serviceCounts: Record<string, { count: number, name: string }> = {}
  const employeeCounts: Record<string, { count: number, name: string }> = {}
  
  const now = new Date()
  let lastAppt: Date | null = null
  let nextAppt: Date | null = null

  for (const b of allBookings) {
    if (b.status === "COMPLETED") completed++
    if (b.status === "CANCELLED") {
      canceled++
      if (b.lateCancellation) lateCanceled++
    }
    if (b.status === "NO_SHOW") noShows++

    if (b.status === "COMPLETED") {
      for (const s of b.services) {
        totalLTV += (s.price || 0)
        serviceCounts[s.serviceId] = {
          count: (serviceCounts[s.serviceId]?.count || 0) + 1,
          name: s.serviceName
        }
      }
      employeeCounts[b.employeeId] = {
        count: (employeeCounts[b.employeeId]?.count || 0) + 1,
        name: b.employee.name + " " + (b.employee.surname || "")
      }
    }

    if (b.startTime < now && b.status === "COMPLETED") {
      if (!lastAppt || b.startTime > lastAppt) lastAppt = b.startTime
    }
    if (b.startTime >= now && b.status === "CONFIRMED") {
      if (!nextAppt || b.startTime < nextAppt) nextAppt = b.startTime
    }
  }

  // Deterministic tie-breaks: count DESC, then lexicographically by name
  const preferredService = Object.values(serviceCounts).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.name.localeCompare(b.name)
  })[0]
  
  const preferredEmployee = Object.values(employeeCounts).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.name.localeCompare(b.name)
  })[0]

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/customers`} className="text-sm text-blue-600 hover:underline mb-2 block">
          &larr; Back to Customers
        </Link>
        <h1 className="text-3xl font-bold">{customer.firstName} {customer.lastName}</h1>
        <p className="text-gray-500">{customer.tenantMembership.user.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Score & Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-4">
                <div className={`text-5xl font-bold ${scoreBand.color} mb-2`}>
                  {customer.score}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${scoreBand.bg} ${scoreBand.color}`}>
                  {scoreBand.label}
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <h4 className="font-semibold text-sm mb-2">Account Status</h4>
                {customer.isBlocked ? (
                  <div className="bg-red-50 text-red-700 p-3 rounded text-sm">
                    <strong>Blocked</strong><br/>
                    {customer.blockReason && <span className="text-xs">Reason: {customer.blockReason}</span>}
                  </div>
                ) : (
                  <div className="bg-green-50 text-green-700 p-3 rounded text-sm font-medium">
                    Active & Allowed to Book
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Value</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Theoretical LTV</div>
                <div className="text-2xl font-semibold">{(totalLTV / 100).toFixed(2)} €</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Completed</div>
                  <div className="font-medium">{completed}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">No Shows</div>
                  <div className="font-medium">{noShows}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Cancellations</div>
                  <div className="font-medium">{canceled}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Late Canceled</div>
                  <div className="font-medium">{lateCanceled}</div>
                </div>
              </div>
              <div className="border-t pt-4 space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Last Appointment</div>
                  <div className="font-medium">{lastAppt ? lastAppt.toLocaleDateString() : "None"}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Next Appointment</div>
                  <div className="font-medium">{nextAppt ? nextAppt.toLocaleDateString() : "None"}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Preferred Service</div>
                  <div className="font-medium">{preferredService?.name || "None"}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Preferred Employee</div>
                  <div className="font-medium">{preferredEmployee?.name || "None"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {customer.tags.map(t => (
                  <span key={t.tagId} className="text-xs px-2 py-1 bg-gray-200 rounded-full" style={{ backgroundColor: t.tag.color || undefined }}>
                    {t.tag.name}
                  </span>
                ))}
                {customer.tags.length === 0 && <span className="text-sm text-gray-500">No tags assigned.</span>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Booking History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 font-semibold">Date</th>
                      <th className="p-2 font-semibold">Service</th>
                      <th className="p-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.bookings.map(b => (
                      <tr key={b.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{new Date(b.startTime).toLocaleString()}</td>
                        <td className="p-2">{b.services.map(s => s.serviceName).join(", ")}</td>
                        <td className="p-2 font-medium">{b.status}</td>
                      </tr>
                    ))}
                    {customer.bookings.length === 0 && (
                      <tr><td colSpan={3} className="p-4 text-center text-gray-500">No bookings found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Staff Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customer.customerNotes.map(note => (
                  <div key={note.id} className="bg-yellow-50 p-3 rounded text-sm border border-yellow-100">
                    <p>{note.content}</p>
                    <div className="mt-2 text-xs text-gray-500">Added on {new Date(note.createdAt).toLocaleString()}</div>
                  </div>
                ))}
                {customer.customerNotes.length === 0 && <p className="text-sm text-gray-500">No internal notes.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
