import { NextRequest, NextResponse } from 'next/server'
import { verifyOAuthState } from '@/lib/calendar/oauth-state'
import { encryptToken } from '@/lib/calendar/encryption'
import { prisma } from '@/lib/db/prisma'
import { env } from '@/lib/env'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const stateToken = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !stateToken) {
    return NextResponse.redirect(`${env.NEXTAUTH_URL}/dashboard/settings/calendar?error=oauth_failed`)
  }

  try {
    const state = verifyOAuthState(stateToken)

    if (state.provider !== 'MICROSOFT') {
      throw new Error('Provider mismatch')
    }

    const callbackUrl = `${env.NEXTAUTH_URL}/api/calendar/oauth/microsoft/callback`

    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.MICROSOFT_CLIENT_ID || '',
        client_secret: env.MICROSOFT_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl
      })
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange MS code')
    }

    const tokenData = await tokenResponse.json()

    if (!tokenData.refresh_token) {
      throw new Error('No refresh token received from Microsoft')
    }

    const existing = await prisma.externalCalendarConnection.findFirst({
      where: { employeeId: state.employeeId, provider: 'MICROSOFT' }
    })
    
    if (existing) {
      await prisma.externalCalendarConnection.update({
        where: { id: existing.id },
        data: {
          encryptedAccessToken: encryptToken(tokenData.access_token),
          encryptedRefreshToken: encryptToken(tokenData.refresh_token),
          tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
          scopes: tokenData.scope,
          syncEnabled: true,
          lastError: null
        }
      })
    } else {
      await prisma.externalCalendarConnection.create({
        data: {
          tenantId: state.tenantId,
          employeeId: state.employeeId,
          provider: 'MICROSOFT',
          encryptedAccessToken: encryptToken(tokenData.access_token),
          encryptedRefreshToken: encryptToken(tokenData.refresh_token),
          tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
          scopes: tokenData.scope,
          syncEnabled: true
        }
      })
    }

    return NextResponse.redirect(`${env.NEXTAUTH_URL}/dashboard/settings/calendar?success=1`)
  } catch (err) {
    console.error('MS OAuth Callback Error:', err)
    return NextResponse.redirect(`${env.NEXTAUTH_URL}/dashboard/settings/calendar?error=invalid_state`)
  }
}
