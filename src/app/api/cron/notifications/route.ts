import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { sendWebPush } from '@/lib/push/server'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const jobs = await prisma.notificationJob.findMany({
    where: {
      status: 'PENDING',
      nextAttemptAt: { lte: new Date() }
    },
    take: 100
  })

  if (jobs.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  let processed = 0

  for (const job of jobs) {
    await prisma.notificationJob.update({
      where: { id: job.id },
      data: { status: 'PROCESSING' }
    })

    try {
      const subs = await prisma.pushSubscription.findMany({
        where: { tenantId: job.tenantId, userId: job.userId, revokedAt: null }
      })

      if (subs.length === 0) {
        // No subs, mark succeeded or skipped
        await prisma.notificationJob.update({
          where: { id: job.id },
          data: { status: 'SUCCEEDED' }
        })
        continue
      }

      let finalPayload = ""
      if (job.payload) {
        try {
          const data = JSON.parse(job.payload)
          const safeData = {
            title: data.title || "New Notification",
            body: data.body ? String(data.body).substring(0, 100) : "", // no PII or long text
            url: data.url && String(data.url).startsWith("/") ? data.url : "/"
          }
          finalPayload = JSON.stringify(safeData)
        } catch (e) {
          finalPayload = JSON.stringify({ title: "New Notification" })
        }
      }

      for (const sub of subs) {
        try {
          await sendWebPush({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          }, finalPayload)
        } catch (err: any) {
          if (err.message === 'SUBSCRIPTION_EXPIRED') {
            await prisma.pushSubscription.update({
              where: { id: sub.id },
              data: { revokedAt: new Date() }
            })
          } else {
            throw err
          }
        }
      }

      await prisma.notificationJob.update({
        where: { id: job.id },
        data: { status: 'SUCCEEDED', lastError: null }
      })
    } catch (err: any) {
      console.error(`Notification Job ${job.id} failed:`, err.message)
      const attempts = job.attempts + 1
      const isFailed = attempts >= 3
      
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status: isFailed ? 'FAILED' : 'PENDING',
          attempts,
          lastError: err.message,
          nextAttemptAt: isFailed ? job.nextAttemptAt : new Date(Date.now() + Math.pow(3, attempts) * 60 * 1000)
        }
      })
    }
    processed++
  }

  return NextResponse.json({ processed })
}
