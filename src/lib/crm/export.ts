export function sanitizeCSV(value: string | number | null | undefined | boolean): string {
  if (value === null || value === undefined) return ""
  let str = String(value)
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str
  }
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    str = `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function sanitizeExcel(value: string | number | null | undefined | boolean): string | number | boolean {
  if (value === null || value === undefined) return ""
  if (typeof value === 'string') {
    if (/^[=+\-@]/.test(value)) {
      return "'" + value
    }
  }
  return value
}

export function buildExportRow(c: any, stats: any) {
  return {
    FirstName: c.firstName,
    LastName: c.lastName,
    Email: c.tenantMembership.user.email,
    Phone: c.phone || "",
    RegistrationDate: c.createdAt.toISOString(),
    CustomerScore: c.score,
    TotalBookings: stats.total,
    CompletedBookings: stats.completed,
    Cancellations: stats.cancelled,
    LateCancellations: stats.lateCancelled,
    NoShows: stats.noShows,
    LastAppointment: stats.lastAppointment ? stats.lastAppointment.toISOString() : "",
    NextAppointment: stats.nextAppointment ? stats.nextAppointment.toISOString() : "",
    PreferredService: stats.preferredService ? stats.preferredService.name : "",
    PreferredEmployee: stats.preferredEmployee ? stats.preferredEmployee.name : "",
    TheoreticalBookingValue: (stats.theoreticalValueMinor / 100).toFixed(2),
    BlockedState: c.isBlocked,
    Tags: c.tags.map((t: any) => t.tag.name).join("; ")
  }
}
