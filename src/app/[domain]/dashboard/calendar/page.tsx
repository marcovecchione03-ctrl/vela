import { prisma } from "@/lib/db/prisma"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import CalendarWrapper from "./CalendarWrapper"
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, addDays } from "date-fns"

export default async function DashboardCalendarPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ domain: string }>
  searchParams: Promise<{ view?: string, date?: string }>
}) {
  const { domain } = await params;
  const { view = "WEEK", date } = await searchParams;

  let tenant = await prisma.tenant.findUnique({
    where: { slug: domain },
    include: { employees: { where: { isActive: true } } }
  })
  if (!tenant && domain.length === 36) {
    tenant = await prisma.tenant.findUnique({ 
      where: { id: domain },
      include: { employees: { where: { isActive: true } } }
    })
  }
  if (!tenant) notFound()

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect(`/api/auth/signin?callbackUrl=/${domain}/dashboard/calendar`)

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } },
    include: { employeeProfile: true }
  })

  if (!membership || !["OWNER", "ADMIN", "EMPLOYEE"].includes(membership.role)) {
    redirect(`/${domain}`)
  }

  const role = membership.role
  const employeeId = membership.employeeProfile?.id

  const referenceDate = date ? new Date(date) : new Date()
  let fetchStart: Date
  let fetchEnd: Date

  if (view === "DAY" || view === "AGENDA") {
    fetchStart = startOfDay(referenceDate)
    fetchEnd = endOfDay(referenceDate)
  } else if (view === "WEEK") {
    fetchStart = startOfWeek(referenceDate, { weekStartsOn: 1 }) // Assuming Monday start
    fetchEnd = endOfWeek(referenceDate, { weekStartsOn: 1 })
  } else {
    // MONTH
    fetchStart = startOfMonth(referenceDate)
    // Add some buffer for previous/next month days shown in the grid
    fetchStart = addDays(fetchStart, -7)
    fetchEnd = endOfMonth(referenceDate)
    fetchEnd = addDays(fetchEnd, 7)
  }

  const whereClause: any = { 
    tenantId: tenant.id,
    startTime: { gte: fetchStart, lte: fetchEnd }
  }
  
  // Employee restricted view
  if (role === "EMPLOYEE" && employeeId) {
    whereClause.employeeId = employeeId
  }

  const [bookings, timeBlocks, exceptions] = await Promise.all([
    prisma.booking.findMany({
      where: whereClause,
      include: {
        services: true,
        employee: true,
        customer: true,
        oneTimeClient: true,
        location: true
      },
      orderBy: { startTime: 'asc' }
    }),
    prisma.timeBlock.findMany({
      where: {
        tenantId: tenant.id,
        ...(role === "EMPLOYEE" && employeeId ? { employeeId } : {})
      }
    }),
    prisma.availabilityException.findMany({
      where: {
        tenantId: tenant.id,
        date: { gte: fetchStart, lte: fetchEnd },
        ...(role === "EMPLOYEE" && employeeId ? { employeeId } : {})
      }
    })
  ])

  return (
    <div className="h-[calc(100vh-80px)] min-h-[600px] flex flex-col bg-white rounded-xl shadow border">
      <CalendarWrapper 
        domain={domain}
        tenantId={tenant.id}
        initialView={view}
        initialDate={referenceDate.toISOString()}
        bookings={bookings}
        timeBlocks={timeBlocks}
        exceptions={exceptions}
        employees={tenant.employees}
        role={role}
        employeeId={employeeId}
      />
    </div>
  )
}
