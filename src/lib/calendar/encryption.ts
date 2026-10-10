import crypto from 'crypto'
import { env } from '@/lib/env'

const ALGORITHM = 'aes-256-gcm'

// Environment validation ensures this is exactly 32 bytes
const getKey = () => Buffer.from(env.CALENDAR_ENCRYPTION_KEY, 'utf8')

export function encryptToken(text: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  
  let encrypted = cipher.update(text, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  
  const authTag = cipher.getAuthTag().toString('base64')
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('base64')}:${authTag}:${encrypted}`
}

export function decryptToken(encryptedData: string): string {
  const parts = encryptedData.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format')
  }
  
  const [iv, authTag, encryptedText] = parts
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(iv, 'base64')
  )
  
  decipher.setAuthTag(Buffer.from(authTag, 'base64'))
  
  let decrypted = decipher.update(encryptedText, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
