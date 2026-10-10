import { Booking, EmployeeProfile, Service, BookingService, Location, CustomerProfile, OneTimeClient } from '@prisma/client'

export type FullBookingForICS = Booking & {
  employee: EmployeeProfile
  location: Location
  services: BookingService[]
  customer: CustomerProfile | null
  oneTimeClient: OneTimeClient | null
}

const formatDateICS = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

const escapeICS = (str: string): string => {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function generateICSFeed(bookings: FullBookingForICS[], employeeName: string): string {
  const dtstamp = formatDateICS(new Date())

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vela Platform//Calendar//EN',
    `X-WR-CALNAME:Vela - ${escapeICS(employeeName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ]

  for (const booking of bookings) {
    // Phase 9 constraints: Exclude CANCELLED and NO_SHOW by default from active feed if preferred,
    // though the requirement says "exclude: CANCELLED, NO_SHOW".
    if (booking.status === 'CANCELLED' || booking.status === 'NO_SHOW') {
      continue
    }

    const servicesStr = booking.services.map(s => s.serviceName).join(', ')
    const customerName = booking.customer
      ? `${booking.customer.firstName} ${booking.customer.lastName}`
      : (booking.oneTimeClient ? `${booking.oneTimeClient.firstName} ${booking.oneTimeClient.lastName}` : 'Customer')
      
    const title = `${servicesStr} — ${customerName}`
    
    // Privacy constraint: Exclude excessive internal/CRM notes.
    const description = `Booking Ref: ${booking.bookingReference}\\nStatus: ${booking.status}`
    const locationStr = `${booking.location.name}${booking.location.address ? ', ' + booking.location.address : ''}`

    ics.push(
      'BEGIN:VEVENT',
      `UID:${booking.id}@vela.app`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${formatDateICS(booking.startTime)}`,
      `DTEND:${formatDateICS(booking.endTime)}`,
      `SUMMARY:${escapeICS(title)}`,
      `DESCRIPTION:${escapeICS(description)}`,
      `LOCATION:${escapeICS(locationStr)}`,
      'END:VEVENT'
    )
  }

  ics.push('END:VCALENDAR')

  // VCALENDAR lines should be separated by CRLF per RFC 5545
  return ics.join('\r\n')
}
