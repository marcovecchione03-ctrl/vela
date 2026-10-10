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
    provider: 'MICROSOFT'
  })

  const callbackUrl = `${env.NEXTAUTH_URL}/api/calendar/oauth/microsoft/callback`
  const scopes = [
    'offline_access',
    'Calendars.ReadWrite'
  ].join(' ')

  const url = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
  url.searchParams.set('client_id', env.MICROSOFT_CLIENT_ID || '')
  url.searchParams.set('redirect_uri', callbackUrl)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scopes)
  url.searchParams.set('response_mode', 'query')
  url.searchParams.set('state', state)

  return NextResponse.redirect(url.toString())
}
