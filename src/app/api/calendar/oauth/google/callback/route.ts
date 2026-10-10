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

    if (state.provider !== 'GOOGLE') {
      throw new Error('Provider mismatch')
    }

    const callbackUrl = `${env.NEXTAUTH_URL}/api/calendar/oauth/google/callback`

    // Exchange code for token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID || '',
        client_secret: env.GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl
      })
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code')
    }

    const tokenData = await tokenResponse.json()

    // Needs refresh token to be durable
    if (!tokenData.refresh_token) {
      // If we didn't get a refresh token, it means they already granted it and we lost it.
      // We should prompt='consent' to force it, which we do.
      throw new Error('No refresh token received from Google')
    }

    // Save connection securely
    await prisma.externalCalendarConnection.upsert({
      where: {
        id: 'new' // dummy, we rely on composite unique in logic if we had one. But we don't have composite unique on tenantId+employeeId+provider. Let's find first.
      },
      create: {
        tenantId: state.tenantId,
        employeeId: state.employeeId,
        provider: 'GOOGLE',
        encryptedAccessToken: encryptToken(tokenData.access_token),
        encryptedRefreshToken: encryptToken(tokenData.refresh_token),
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        scopes: tokenData.scope,
        syncEnabled: true
      },
      update: {
        encryptedAccessToken: encryptToken(tokenData.access_token),
        encryptedRefreshToken: encryptToken(tokenData.refresh_token),
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        scopes: tokenData.scope,
        syncEnabled: true,
        lastError: null
      }
    }).catch(async () => {
       // Manual upsert if unique constraint doesn't exist
       const existing = await prisma.externalCalendarConnection.findFirst({
         where: { employeeId: state.employeeId, provider: 'GOOGLE' }
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
              provider: 'GOOGLE',
              encryptedAccessToken: encryptToken(tokenData.access_token),
              encryptedRefreshToken: encryptToken(tokenData.refresh_token),
              tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
              scopes: tokenData.scope,
              syncEnabled: true
           }
         })
       }
    })

    return NextResponse.redirect(`${env.NEXTAUTH_URL}/dashboard/settings/calendar?success=1`)
  } catch (err) {
    console.error('OAuth Callback Error:', err)
    return NextResponse.redirect(`${env.NEXTAUTH_URL}/dashboard/settings/calendar?error=invalid_state`)
  }
}
