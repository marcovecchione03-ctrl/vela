import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { generateOAuthState } from '@/lib/calendar/oauth-state'
import { env } from '@/lib/env'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')
  const employeeId = searchParams.get('employeeId')

  if (!tenantId || !employeeId) {
    return new NextResponse('Missing params', { status: 400 })
  }

  // Authorize: user must be the actual employee they are trying to connect
  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId: session.user.id } },
    include: { employeeProfile: true }
  })

  if (!membership || !membership.employeeProfile || membership.employeeProfile.id !== employeeId) {
    return new NextResponse('Forbidden: Can only connect your own calendar', { status: 403 })
  }

  const state = generateOAuthState({
    userId: session.user.id,
    tenantId,
    employeeId,
    provider: 'GOOGLE'
  })

  // Google OAuth URL construction
  const callbackUrl = `${env.NEXTAUTH_URL}/api/calendar/oauth/google/callback`
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events' // minimal scope
  ].join(' ')

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID || '')
  url.searchParams.set('redirect_uri', callbackUrl)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scopes)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent') // force refresh token
  url.searchParams.set('state', state)

  return NextResponse.redirect(url.toString())
}
