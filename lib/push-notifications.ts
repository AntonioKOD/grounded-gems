import { getPayload } from 'payload'
import config from '@/payload.config'

interface PushNotificationPayload {
  title: string
  body: string
  data?: Record<string, any>
  badge?: number
  sound?: string
}

interface DeviceToken {
  id: string
  deviceToken: string
  user: string
  platform: string
  isActive: boolean
}

export async function sendPushNotification(
  userId: string,
  notification: PushNotificationPayload
): Promise<boolean> {
  try {
    const payload = await getPayload({ config })
    
    // Get user's active device tokens
    const deviceTokens = await payload.find({
      collection: 'deviceTokens',
      where: {
        and: [
          { user: { equals: userId } },
          { isActive: { equals: true } }
        ]
      }
    })

    if (deviceTokens.docs.length === 0) {
      console.log(`No active device tokens found for user ${userId}`)
      return false
    }

    const results = await Promise.allSettled(
      deviceTokens.docs.map(async (device: any) => {
        return sendToDevice(device.deviceToken, notification)
      })
    )

    const successful = results.filter(result => result.status === 'fulfilled').length
    const failed = results.filter(result => result.status === 'rejected').length

    console.log(`Push notification sent to user ${userId}: ${successful} successful, ${failed} failed`)
    return successful > 0
  } catch (error) {
    console.error('Error sending push notification:', error)
    return false
  }
}

export async function sendPushNotificationToMultipleUsers(
  userIds: string[],
  notification: PushNotificationPayload
): Promise<{ successful: number; failed: number }> {
  try {
    const payload = await getPayload({ config })
    
    // Get all active device tokens for these users
    const deviceTokens = await payload.find({
      collection: 'deviceTokens',
      where: {
        and: [
          { user: { in: userIds } },
          { isActive: { equals: true } }
        ]
      }
    })

    if (deviceTokens.docs.length === 0) {
      console.log(`No active device tokens found for users: ${userIds.join(', ')}`)
      return { successful: 0, failed: 0 }
    }

    const results = await Promise.allSettled(
      deviceTokens.docs.map(async (device: any) => {
        return sendToDevice(device.deviceToken, notification)
      })
    )

    const successful = results.filter(result => result.status === 'fulfilled').length
    const failed = results.filter(result => result.status === 'rejected').length

    console.log(`Push notification sent to ${userIds.length} users: ${successful} successful, ${failed} failed`)
    return { successful, failed }
  } catch (error) {
    console.error('Error sending push notifications to multiple users:', error)
    return { successful: 0, failed: userIds.length }
  }
}

async function sendToDevice(deviceToken: string, notification: PushNotificationPayload): Promise<boolean> {
  try {
    // For development, we'll use a simple HTTP request
    // In production, you should use Apple's APNs service or a service like Firebase Cloud Messaging
    
    const payload = {
      aps: {
        alert: {
          title: notification.title,
          body: notification.body
        },
        badge: notification.badge || 1,
        sound: notification.sound || 'default',
        'content-available': 1
      },
      ...notification.data
    }

    // For now, we'll just log the notification
    // In production, you would send this to Apple's APNs
    console.log(`Would send push notification to device ${deviceToken}:`, payload)
    
    // TODO: Implement actual APNs sending
    // You'll need to:
    // 1. Set up Apple Developer account
    // 2. Create APNs certificates
    // 3. Use a library like 'apn' or 'node-apn' to send notifications
    
    return true
  } catch (error) {
    console.error(`Error sending to device ${deviceToken}:`, error)
    return false
  }
}

// Helper functions for common notification types
export async function sendNewLocationNotification(
  userId: string,
  locationName: string,
  locationId: string
): Promise<boolean> {
  return sendPushNotification(userId, {
    title: 'New Location Added',
    body: `A new location "${locationName}" has been added near you!`,
    data: {
      type: 'new_location',
      locationId
    },
    badge: 1
  })
}

export async function sendNewReviewNotification(
  userId: string,
  locationName: string,
  locationId: string,
  reviewerName: string
): Promise<boolean> {
  return sendPushNotification(userId, {
    title: 'New Review',
    body: `${reviewerName} left a review for ${locationName}`,
    data: {
      type: 'new_review',
      locationId
    },
    badge: 1
  })
}

export async function sendFriendActivityNotification(
  userId: string,
  friendName: string,
  activity: string
): Promise<boolean> {
  return sendPushNotification(userId, {
    title: 'Friend Activity',
    body: `${friendName} ${activity}`,
    data: {
      type: 'friend_activity',
      activity
    },
    badge: 1
  })
}

export async function sendEventReminderNotification(
  userId: string,
  eventTitle: string,
  eventId: string,
  eventTime: string
): Promise<boolean> {
  return sendPushNotification(userId, {
    title: 'Event Reminder',
    body: `Don't forget! ${eventTitle} starts at ${eventTime}`,
    data: {
      type: 'event_reminder',
      eventId
    },
    badge: 1
  })
} 