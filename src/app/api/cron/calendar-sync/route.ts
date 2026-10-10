import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { GoogleCalendarProvider } from '@/lib/calendar/providers/google'
import { MicrosoftCalendarProvider } from '@/lib/calendar/providers/microsoft'
import { CalendarEventData, ProviderError } from '@/lib/calendar/provider'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Find pending jobs
  const jobs = await prisma.calendarSyncJob.findMany({
    where: {
      status: 'PENDING',
      nextAttemptAt: { lte: new Date() }
    },
    take: 50,
    include: {
      connection: true
    }
  })

  if (jobs.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  const googleProvider = new GoogleCalendarProvider()
  const microsoftProvider = new MicrosoftCalendarProvider()

  let processed = 0

  for (const job of jobs) {
    // Skip if revoked or disabled
    if (job.connection.syncEnabled === false || job.connection.revokedAt !== null) {
      await prisma.calendarSyncJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', lastError: 'Connection is disabled or revoked' }
      })
      processed++
      continue
    }

    await prisma.calendarSyncJob.update({
      where: { id: job.id },
      data: { status: 'PROCESSING' }
    })

    const provider = job.connection.provider === 'GOOGLE' ? googleProvider : microsoftProvider

    try {
      const booking = await prisma.booking.findUnique({
        where: { id: job.bookingId },
        include: { location: true, services: true, customer: true, oneTimeClient: true }
      })

      if (!booking && job.action !== 'DELETE') {
        throw new ProviderError('Booking not found for CREATE/UPDATE sync', 'PERMANENT')
      }

      const servicesStr = booking?.services.map(s => s.serviceName).join(', ')
      const customerName = booking?.customer 
        ? `${booking.customer.firstName} ${booking.customer.lastName}`
        : (booking?.oneTimeClient ? `${booking.oneTimeClient.firstName} ${booking.oneTimeClient.lastName}` : 'Customer')
        
      const eventData: CalendarEventData | undefined = booking ? {
        title: `${servicesStr} — ${customerName}`,
        description: `Booking Ref: ${booking.bookingReference}\nStatus: ${booking.status}`,
        location: `${booking.location.name}${booking.location.address ? ', ' + booking.location.address : ''}`,
        startTime: booking.startTime,
        endTime: booking.endTime
      } : undefined

      const existingMapping = await prisma.externalCalendarEvent.findUnique({
        where: {
          bookingId_connectionId: {
            bookingId: job.bookingId,
            connectionId: job.connectionId
          }
        }
      })

      if (job.action === 'CREATE') {
        if (existingMapping) {
          // Idempotency: fallback to update
          try {
            await provider.updateEvent(job.connectionId, existingMapping.externalEventId, eventData!)
          } catch (err: any) {
            if (err instanceof ProviderError && err.classification === 'NOT_FOUND') {
              // Recreate if it was deleted
              const extId = await provider.createEvent(job.connectionId, eventData!)
              await prisma.externalCalendarEvent.update({
                where: { id: existingMapping.id },
                data: { externalEventId: extId }
              })
            } else throw err;
          }
        } else {
          const extId = await provider.createEvent(job.connectionId, eventData!)
          await prisma.externalCalendarEvent.create({
            data: {
              tenantId: job.tenantId,
              bookingId: job.bookingId,
              employeeId: job.employeeId,
              connectionId: job.connectionId,
              provider: job.connection.provider,
              externalEventId: extId,
              externalCalendarId: job.connection.externalCalendarId || 'primary'
            }
          })
        }
      } else if (job.action === 'UPDATE') {
        if (existingMapping) {
          try {
            await provider.updateEvent(job.connectionId, existingMapping.externalEventId, eventData!)
          } catch (err: any) {
            if (err instanceof ProviderError && err.classification === 'NOT_FOUND') {
              // Recreate and repair mapping
              const extId = await provider.createEvent(job.connectionId, eventData!)
              await prisma.externalCalendarEvent.update({
                where: { id: existingMapping.id },
                data: { externalEventId: extId }
              })
            } else throw err;
          }
        } else {
          // Missing mapping, recover with CREATE
          const extId = await provider.createEvent(job.connectionId, eventData!)
          await prisma.externalCalendarEvent.create({
            data: {
              tenantId: job.tenantId,
              bookingId: job.bookingId,
              employeeId: job.employeeId,
              connectionId: job.connectionId,
              provider: job.connection.provider,
              externalEventId: extId,
              externalCalendarId: job.connection.externalCalendarId || 'primary'
            }
          })
        }
      } else if (job.action === 'DELETE') {
        if (existingMapping) {
          try {
            await provider.deleteEvent(job.connectionId, existingMapping.externalEventId)
          } catch (err: any) {
            if (err instanceof ProviderError && err.classification === 'NOT_FOUND') {
               // Idempotent success
            } else throw err;
          }
          await prisma.externalCalendarEvent.delete({ where: { id: existingMapping.id } })
        }
        // If missing mapping for DELETE, it's an idempotent success
      }

      await prisma.calendarSyncJob.update({
        where: { id: job.id },
        data: { status: 'SUCCEEDED', lastError: null }
      })

    } catch (err: any) {
      const attempts = job.attempts + 1
      
      let isPermanent = attempts >= 5
      let errorClass = 'UNKNOWN'
      let safeErrorMessage = 'Unknown error occurred'
      
      if (err instanceof ProviderError) {
        errorClass = err.classification
        safeErrorMessage = `[${err.classification}] Sync failed`
        if (err.classification === 'AUTH_RECONNECT_REQUIRED' || err.classification === 'PERMANENT') {
          isPermanent = true
        }
      }

      // Safe logging (no raw error message or tokens)
      console.error(`Sync Job ${job.id} failed: ${errorClass}`)

      if (isPermanent && errorClass === 'AUTH_RECONNECT_REQUIRED') {
        await prisma.externalCalendarConnection.update({
          where: { id: job.connectionId },
          data: { syncEnabled: false, lastError: 'Authentication revoked or invalid. Please reconnect.' }
        })
      }
      
      await prisma.calendarSyncJob.update({
        where: { id: job.id },
        data: {
          status: isPermanent ? 'FAILED' : 'PENDING',
          attempts,
          lastError: safeErrorMessage,
          nextAttemptAt: isPermanent ? job.nextAttemptAt : new Date(Date.now() + Math.pow(5, attempts) * 60 * 1000)
        }
      })
    }
    processed++
  }

  return NextResponse.json({ processed })
}
