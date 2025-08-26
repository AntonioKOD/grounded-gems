import webpush from 'web-push'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Configure VAPID keys for web push notifications
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BLJSx5x2nt-UvZwuThlCklpYc7jJYuNo6HV3-1YzJXhq4k0v_Qykhtc2WwrU4YNYBF_9GaJKFGFREfwew6Mr3Zk'
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'ckbFEDen5mV6trwbPM0NHrOxrSA6vbNTVy9ySPHGYys'

webpush.setVapidDetails(
  'mailto:hello@sacavia.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, any>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
  vibrate?: number[]
}

export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    const payloadInstance = await getPayload({ config })
    
    // Get user's push subscriptions
    const subscriptions = await payloadInstance.find({
      collection: 'push-subscriptions',
      where: {
        and: [
          { user: { equals: userId } },
          { isActive: { equals: true } }
        ]
      }
    })

    if (subscriptions.docs.length === 0) {
      console.log(`No active push subscriptions found for user ${userId}`)
      return false
    }

    const notificationPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1,
        ...payload.data
      },
      actions: payload.actions || [
        {
          action: 'explore',
          title: 'View',
          icon: '/icon-192.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icon-192.png'
        }
      ],
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
      vibrate: payload.vibrate || [200, 100, 200]
    }

    let successCount = 0
    const errors: string[] = []

    // Send to all user's subscriptions
    for (const subscription of subscriptions.docs) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
          }
        }

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(notificationPayload)
        )
        
        successCount++
        console.log(`Push notification sent successfully to ${subscription.endpoint}`)
        
      } catch (error: any) {
        console.error(`Failed to send push notification to ${subscription.endpoint}:`, error)
        errors.push(error.message)
        
        // If subscription is invalid, mark it as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          await payloadInstance.update({
            collection: 'push-subscriptions',
            id: subscription.id,
            data: {
              isActive: false
            }
          })
          console.log(`Marked subscription ${subscription.id} as inactive due to invalid endpoint`)
        }
      }
    }

    console.log(`Push notification results for user ${userId}: ${successCount} successful, ${errors.length} failed`)
    return successCount > 0

  } catch (error) {
    console.error('Error sending push notification:', error)
    return false
  }
}

export async function sendPushNotificationToMultipleUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  let successCount = 0
  let failedCount = 0

  for (const userId of userIds) {
    const success = await sendPushNotification(userId, payload)
    if (success) {
      successCount++
    } else {
      failedCount++
    }
  }

  return { success: successCount, failed: failedCount }
}

export async function sendBulkPushNotification(
  payload: PushNotificationPayload,
  filter?: { [key: string]: any }
): Promise<{ success: number; failed: number }> {
  try {
    const payloadInstance = await getPayload({ config })
    
    // Get all active subscriptions
    const whereClause = { isActive: { equals: true } }
    if (filter) {
      Object.assign(whereClause, filter)
    }

    const subscriptions = await payloadInstance.find({
      collection: 'push-subscriptions',
      where: whereClause,
      limit: 1000 // Limit to prevent overwhelming the system
    })

    if (subscriptions.docs.length === 0) {
      console.log('No active push subscriptions found for bulk notification')
      return { success: 0, failed: 0 }
    }

    const notificationPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1,
        ...payload.data
      },
      actions: payload.actions || [
        {
          action: 'explore',
          title: 'View',
          icon: '/icon-192.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/icon-192.png'
        }
      ],
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
      vibrate: payload.vibrate || [200, 100, 200]
    }

    let successCount = 0
    let failedCount = 0

    // Send to all subscriptions
    for (const subscription of subscriptions.docs) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
          }
        }

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(notificationPayload)
        )
        
        successCount++
        
      } catch (error: any) {
        failedCount++
        console.error(`Failed to send bulk push notification to ${subscription.endpoint}:`, error)
        
        // If subscription is invalid, mark it as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          await payloadInstance.update({
            collection: 'push-subscriptions',
            id: subscription.id,
            data: {
              isActive: false
            }
          })
        }
      }
    }

    console.log(`Bulk push notification results: ${successCount} successful, ${failedCount} failed`)
    return { success: successCount, failed: failedCount }

  } catch (error) {
    console.error('Error sending bulk push notification:', error)
    return { success: 0, failed: 0 }
  }
} 