import { CalendarProvider, CalendarEventData, ProviderError } from '../provider'
import { prisma } from '@/lib/db/prisma'
import { decryptToken, encryptToken } from '../encryption'
import { env } from '@/lib/env'

function mapMicrosoftError(status: number, message: string): ProviderError {
  if (status === 401 || status === 403) return new ProviderError(`Auth failed: ${message}`, 'AUTH_RECONNECT_REQUIRED')
  if (status === 404) return new ProviderError(`Not found: ${message}`, 'NOT_FOUND')
  if (status === 429) return new ProviderError(`Rate limited: ${message}`, 'RATE_LIMIT')
  if (status >= 500) return new ProviderError(`Microsoft transient error: ${message}`, 'TRANSIENT')
  return new ProviderError(`Permanent Microsoft error: ${message}`, 'PERMANENT')
}

export class MicrosoftCalendarProvider implements CalendarProvider {
  async refreshCredentials(connectionId: string): Promise<void> {
    const conn = await prisma.externalCalendarConnection.findUnique({
      where: { id: connectionId }
    })
    if (!conn) throw new ProviderError('Connection not found', 'PERMANENT')
    
    if (conn.tokenExpiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
      return
    }

    const refreshToken = decryptToken(conn.encryptedRefreshToken)
    
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.MICROSOFT_CLIENT_ID || '',
        client_secret: env.MICROSOFT_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      if (errorData.error === 'invalid_grant') {
        await prisma.externalCalendarConnection.update({
          where: { id: connectionId },
          data: { syncEnabled: false, lastError: 'Refresh token revoked or invalid. Please reconnect.' }
        })
        throw new ProviderError('Microsoft refresh token revoked', 'AUTH_RECONNECT_REQUIRED')
      }
      throw mapMicrosoftError(response.status, `Token refresh failed: ${errorData.error_description || response.statusText}`)
    }

    const data = await response.json()
    await prisma.externalCalendarConnection.update({
      where: { id: connectionId },
      data: {
        encryptedAccessToken: encryptToken(data.access_token),
        ...(data.refresh_token ? { encryptedRefreshToken: encryptToken(data.refresh_token) } : {}),
        tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
        lastError: null,
        syncEnabled: true
      }
    })
  }

  async createEvent(connectionId: string, eventData: CalendarEventData): Promise<string> {
    await this.refreshCredentials(connectionId)
    
    const conn = await prisma.externalCalendarConnection.findUnique({ where: { id: connectionId } })
    const accessToken = decryptToken(conn!.encryptedAccessToken)

    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: eventData.title,
        body: {
          contentType: 'Text',
          content: eventData.description
        },
        location: eventData.location ? { displayName: eventData.location } : undefined,
        start: { dateTime: eventData.startTime.toISOString(), timeZone: 'UTC' },
        end: { dateTime: eventData.endTime.toISOString(), timeZone: 'UTC' }
      })
    })

    if (!response.ok) {
      throw mapMicrosoftError(response.status, await response.text().catch(()=>''))
    }

    const data = await response.json()
    return data.id
  }

  async updateEvent(connectionId: string, externalEventId: string, eventData: CalendarEventData): Promise<void> {
    await this.refreshCredentials(connectionId)
    
    const conn = await prisma.externalCalendarConnection.findUnique({ where: { id: connectionId } })
    const accessToken = decryptToken(conn!.encryptedAccessToken)

    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${externalEventId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: eventData.title,
        body: {
          contentType: 'Text',
          content: eventData.description
        },
        location: eventData.location ? { displayName: eventData.location } : undefined,
        start: { dateTime: eventData.startTime.toISOString(), timeZone: 'UTC' },
        end: { dateTime: eventData.endTime.toISOString(), timeZone: 'UTC' }
      })
    })

    if (!response.ok) {
      throw mapMicrosoftError(response.status, await response.text().catch(()=>''))
    }
  }

  async deleteEvent(connectionId: string, externalEventId: string): Promise<void> {
    await this.refreshCredentials(connectionId)
    
    const conn = await prisma.externalCalendarConnection.findUnique({ where: { id: connectionId } })
    const accessToken = decryptToken(conn!.encryptedAccessToken)

    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${externalEventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok && response.status !== 404) {
      throw mapMicrosoftError(response.status, await response.text().catch(()=>''))
    }
  }
}
