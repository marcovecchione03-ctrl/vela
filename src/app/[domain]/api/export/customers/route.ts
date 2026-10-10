import { requireRole } from "@/lib/auth/rbac"
import { prisma } from "@/lib/db/prisma"
import { getTenantFromDomain } from "@/lib/tenant/context"
import { NextRequest, NextResponse } from "next/server"
import { computeCustomerAggregates, employeeDisplayName, AggregateBooking } from "@/lib/crm/aggregates"
import ExcelJS from "exceljs"

import { sanitizeCSV, sanitizeExcel, buildExportRow } from "@/lib/crm/export"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const resolvedParams = await params;
    const tenant = await getTenantFromDomain(resolvedParams.domain)
    if (!tenant) {
      return new NextResponse("Tenant not found", { status: 404 })
    }

    const { role } = await requireRole(tenant, ["OWNER", "ADMIN"])

    const url = new URL(req.url)
    const format = url.searchParams.get("format") || "csv"

    const customers = await prisma.customerProfile.findMany({
      where: { tenantId: tenant },
      take: 2000, // Safe bound for V1
      include: {
        tenantMembership: { include: { user: true } },
        tags: { include: { tag: true } },
        bookings: {
          include: { services: true, employee: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    const now = new Date()
    const rows = []

    for (const c of customers) {
      const aggBookings: AggregateBooking[] = c.bookings.map(b => ({
        id: b.id,
        status: b.status,
        startTime: b.startTime,
        lateCancellation: b.lateCancellation,
        employeeId: b.employeeId || "",
        employeeName: b.employee ? employeeDisplayName({ name: b.employee.name, surname: b.employee.surname }) : "",
        services: b.services.map(s => ({
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          price: s.price || 0
        }))
      }))

      const stats = computeCustomerAggregates(aggBookings, now)

      rows.push(buildExportRow(c, stats))
    }

    await prisma.auditLog.create({
      data: {
        tenantId: tenant,
        actorId: "SYSTEM",
        action: "CRM_EXPORT",
        entityType: "Tenant",
        entityId: tenant,
        metadata: JSON.stringify({ format, count: customers.length })
      }
    })

    if (format === "csv") {
      let csv = "FirstName,LastName,Email,Phone,RegistrationDate,CustomerScore,TotalBookings,CompletedBookings,Cancellations,LateCancellations,NoShows,LastAppointment,NextAppointment,PreferredService,PreferredEmployee,TheoreticalBookingValue,BlockedState,Tags\n"
      
      for (const r of rows) {
        csv += [
          sanitizeCSV(r.FirstName),
          sanitizeCSV(r.LastName),
          sanitizeCSV(r.Email),
          sanitizeCSV(r.Phone),
          sanitizeCSV(r.RegistrationDate),
          sanitizeCSV(r.CustomerScore),
          sanitizeCSV(r.TotalBookings),
          sanitizeCSV(r.CompletedBookings),
          sanitizeCSV(r.Cancellations),
          sanitizeCSV(r.LateCancellations),
          sanitizeCSV(r.NoShows),
          sanitizeCSV(r.LastAppointment),
          sanitizeCSV(r.NextAppointment),
          sanitizeCSV(r.PreferredService),
          sanitizeCSV(r.PreferredEmployee),
          sanitizeCSV(r.TheoreticalBookingValue),
          sanitizeCSV(r.BlockedState),
          sanitizeCSV(r.Tags)
        ].join(",") + "\n"
      }

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="customers.csv"'
        }
      })
    } else {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Customers")
      
      worksheet.columns = [
        { header: "First Name", key: "FirstName", width: 20 },
        { header: "Last Name", key: "LastName", width: 20 },
        { header: "Email", key: "Email", width: 30 },
        { header: "Phone", key: "Phone", width: 15 },
        { header: "Registration Date", key: "RegistrationDate", width: 20 },
        { header: "Score", key: "CustomerScore", width: 10 },
        { header: "Total Bookings", key: "TotalBookings", width: 15 },
        { header: "Completed", key: "CompletedBookings", width: 12 },
        { header: "Cancellations", key: "Cancellations", width: 15 },
        { header: "Late Cancellations", key: "LateCancellations", width: 18 },
        { header: "No Shows", key: "NoShows", width: 10 },
        { header: "Last Appointment", key: "LastAppointment", width: 20 },
        { header: "Next Appointment", key: "NextAppointment", width: 20 },
        { header: "Preferred Service", key: "PreferredService", width: 25 },
        { header: "Preferred Employee", key: "PreferredEmployee", width: 25 },
        { header: "Theoretical Value", key: "TheoreticalBookingValue", width: 18 },
        { header: "Blocked", key: "BlockedState", width: 10 },
        { header: "Tags", key: "Tags", width: 30 },
      ]

      const sanitizedRows = rows.map(r => ({
        FirstName: sanitizeExcel(r.FirstName),
        LastName: sanitizeExcel(r.LastName),
        Email: sanitizeExcel(r.Email),
        Phone: sanitizeExcel(r.Phone),
        RegistrationDate: sanitizeExcel(r.RegistrationDate),
        CustomerScore: sanitizeExcel(r.CustomerScore),
        TotalBookings: sanitizeExcel(r.TotalBookings),
        CompletedBookings: sanitizeExcel(r.CompletedBookings),
        Cancellations: sanitizeExcel(r.Cancellations),
        LateCancellations: sanitizeExcel(r.LateCancellations),
        NoShows: sanitizeExcel(r.NoShows),
        LastAppointment: sanitizeExcel(r.LastAppointment),
        NextAppointment: sanitizeExcel(r.NextAppointment),
        PreferredService: sanitizeExcel(r.PreferredService),
        PreferredEmployee: sanitizeExcel(r.PreferredEmployee),
        TheoreticalBookingValue: sanitizeExcel(r.TheoreticalBookingValue),
        BlockedState: sanitizeExcel(r.BlockedState),
        Tags: sanitizeExcel(r.Tags)
      }))

      worksheet.addRows(sanitizedRows)

      const buffer = await workbook.xlsx.writeBuffer()
      
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="customers.xlsx"'
        }
      })
    }
  } catch (err: any) {
    return new NextResponse(err.message, { status: 401 })
  }
}
