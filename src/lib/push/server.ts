import webpush from 'web-push'
import { env } from '@/lib/env'

const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = env.VAPID_PRIVATE_KEY
const subject = env.VAPID_SUBJECT || 'mailto:admin@example.com'

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export async function sendWebPush(
  subscription: webpush.PushSubscription,
  payload: string
): Promise<void> {
  if (!publicKey || !privateKey) {
    console.warn('Web push VAPID keys not configured')
    return
  }

  try {
    await webpush.sendNotification(subscription, payload)
  } catch (error: any) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      throw new Error('SUBSCRIPTION_EXPIRED')
    }
    throw error
  }
}
