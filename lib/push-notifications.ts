import { getPayload } from 'payload'
import config from '@/payload.config'
import apn from 'apn'

// Initialize APNs provider for development
let apnProvider: apn.Provider | null = null

// Initialize APNs provider
function getApnProvider(): apn.Provider | null {
  if (apnProvider) return apnProvider
  
  try {
    // For development, we'll use a simple provider
    // In production, you'll need to provide actual certificates
    apnProvider = new apn.Provider({
      token: {
        key: process.env.APN_KEY_PATH || '', // Path to your APN key file
        keyId: process.env.APN_KEY_ID || '', // Your APN key ID
        teamId: process.env.APN_TEAM_ID || '' // Your Apple Team ID
      },
      production: process.env.NODE_ENV === 'production'
    })
    
    return apnProvider
  } catch (error) {
    console.error('Failed to initialize APNs provider:', error)
    return null
  }
}

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
    const provider = getApnProvider()
    
    if (!provider) {
      // Fallback to logging for development
      console.log(`🔔 [PushNotification] Would send to device ${deviceToken}:`, {
        title: notification.title,
        body: notification.body,
        data: notification.data
      })
      return true
    }

    const apnNotification = new apn.Notification()
    apnNotification.alert = {
      title: notification.title,
      body: notification.body
    }
    apnNotification.badge = notification.badge || 1
    apnNotification.sound = notification.sound || 'default'
    apnNotification.topic = 'com.sacavia.app' // Your app's bundle identifier
    apnNotification.payload = notification.data || {}
    
    const result = await provider.send(apnNotification, deviceToken)
    
    if (result.failed.length > 0) {
      console.error(`❌ [PushNotification] Failed to send to device ${deviceToken}:`, result.failed[0]?.response || 'Unknown error')
      return false
    }
    
    console.log(`✅ [PushNotification] Successfully sent to device ${deviceToken}`)
    return true
  } catch (error) {
    console.error(`❌ [PushNotification] Error sending to device ${deviceToken}:`, error)
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