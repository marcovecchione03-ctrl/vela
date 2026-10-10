import crypto from 'crypto'
import { env } from '@/lib/env'

export interface OAuthState {
  userId: string
  tenantId: string
  employeeId: string
  provider: 'GOOGLE' | 'MICROSOFT'
  exp: number
}

// Ensure the encryption key is exactly 32 bytes
const getKey = () => Buffer.from(env.CALENDAR_ENCRYPTION_KEY, 'utf8')

export function generateOAuthState(data: Omit<OAuthState, 'exp'>): string {
  const state: OAuthState = {
    ...data,
    exp: Date.now() + 15 * 60 * 1000 // 15 mins expiry
  }
  
  const payload = JSON.stringify(state)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  
  let encrypted = cipher.update(payload, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  
  const authTag = cipher.getAuthTag().toString('base64')
  
  return Buffer.from(`${iv.toString('base64')}:${authTag}:${encrypted}`).toString('base64')
}

export function verifyOAuthState(token: string): OAuthState {
  try {
    const decodedToken = Buffer.from(token, 'base64').toString('utf8')
    const parts = decodedToken.split(':')
    if (parts.length !== 3) throw new Error('Invalid token')
    
    const [iv, authTag, encryptedText] = parts
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(iv, 'base64'))
    decipher.setAuthTag(Buffer.from(authTag, 'base64'))
    
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    
    const state: OAuthState = JSON.parse(decrypted)
    
    if (Date.now() > state.exp) {
      throw new Error('OAuth state expired')
    }
    
    return state
  } catch (err) {
    throw new Error('Invalid or expired OAuth state')
  }
}
