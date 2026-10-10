// In a real production system, this would use Redis.
// For this MVP, we use an in-memory map which works per-process (sufficient for single instance Next.js).

type RateLimitRecord = {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitRecord>()

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now()
  const record = store.get(key)
  
  if (!record) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  
  if (now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  
  if (record.count >= limit) {
    return false
  }
  
  record.count += 1
  return true
}

export function generateRateLimitKey(identifier: string, action: string) {
  return `${action}:${identifier}`
}
