import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { generateICSFeed } from '@/lib/calendar/ics'
import crypto from 'crypto'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: rawToken } = await params
  if (!rawToken) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

  const employee = await prisma.employeeProfile.findFirst({
    where: { icsTokenHash: tokenHash },
    include: {
      bookings: {
        where: {
          status: { in: ['CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'] }
        },
        include: {
          employee: true,
          location: true,
          services: true,
          customer: true,
          oneTimeClient: true
        }
      }
    }
  })

  if (!employee) {
    return new NextResponse('Invalid or revoked token', { status: 403 })
  }

  const icsFeed = generateICSFeed(employee.bookings as any, `${employee.name} ${employee.surname || ''}`.trim())

  return new NextResponse(icsFeed, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="vela-schedule-${employee.id}.ics"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })
}
