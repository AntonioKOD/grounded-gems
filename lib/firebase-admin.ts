import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    const serviceAccount: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    }

    // Validate required fields
    if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
      throw new Error('Missing required Firebase service account configuration')
    }

    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    })
  }
}

// Get Firebase Messaging instance
export const getFirebaseMessaging = () => {
  initializeFirebaseAdmin()
  return getMessaging()
}

// Send FCM message to a specific device token
export const sendFCMMessage = async (
  token: string,
  notification: {
    title: string
    body: string
    imageUrl?: string
  },
  data?: Record<string, string>,
  apns?: {
    payload?: Record<string, any>
    headers?: Record<string, string>
  }
) => {
  try {
    const messaging = getFirebaseMessaging()

    const message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.imageUrl && { image: notification.imageUrl }),
      },
      data,
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body,
            },
            sound: 'default',
            badge: 1,
            ...(notification.imageUrl && { 'mutable-content': '1' }),
          },
          ...apns?.payload,
        },
        headers: {
          'apns-priority': '10',
          'apns-expiration': (Math.floor(Date.now() / 1000) + 86400).toString(), // 24 hours
          ...apns?.headers,
        },
      },
    }

    const response = await messaging.send(message)
    return { success: true, messageId: response }
  } catch (error) {
    console.error('Error sending FCM message:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Send FCM message to multiple device tokens
export const sendFCMMessageToMultipleTokens = async (
  tokens: string[],
  notification: {
    title: string
    body: string
    imageUrl?: string
  },
  data?: Record<string, string>,
  apns?: {
    payload?: Record<string, any>
    headers?: Record<string, string>
  }
) => {
  try {
    const messaging = getFirebaseMessaging()

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.imageUrl && { image: notification.imageUrl }),
      },
      data,
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body,
            },
            sound: 'default',
            badge: 1,
            ...(notification.imageUrl && { 'mutable-content': '1' }),
          },
          ...apns?.payload,
        },
        headers: {
          'apns-priority': '10',
          'apns-expiration': (Math.floor(Date.now() / 1000) + 86400).toString(), // 24 hours
          ...apns?.headers,
        },
      },
    }

    // Use sendEachForMulticast instead of sendMulticast
    const response = await messaging.sendEachForMulticast({
      tokens,
      ...message,
    })

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    }
  } catch (error) {
    console.error('Error sending FCM multicast message:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Send FCM message to a topic
export const sendFCMMessageToTopic = async (
  topic: string,
  notification: {
    title: string
    body: string
    imageUrl?: string
  },
  data?: Record<string, string>,
  apns?: {
    payload?: Record<string, any>
    headers?: Record<string, string>
  }
) => {
  try {
    const messaging = getFirebaseMessaging()

    const message = {
      topic,
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.imageUrl && { image: notification.imageUrl }),
      },
      data,
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body,
            },
            sound: 'default',
            badge: 1,
            ...(notification.imageUrl && { 'mutable-content': '1' }),
          },
          ...apns?.payload,
        },
        headers: {
          'apns-priority': '10',
          'apns-expiration': (Math.floor(Date.now() / 1000) + 86400).toString(), // 24 hours
          ...apns?.headers,
        },
      },
    }

    const response = await messaging.send(message)
    return { success: true, messageId: response }
  } catch (error) {
    console.error('Error sending FCM topic message:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Export a default sender object for backward compatibility
export const firebaseSender = {
  sendMessage: sendFCMMessage,
  sendMessageToMultipleTokens: sendFCMMessageToMultipleTokens,
  sendMessageToTopic: sendFCMMessageToTopic,
  getMessaging: getFirebaseMessaging,

  // Add missing methods for backward compatibility
  getStatus() {
    return {
      configured: !!process.env.FIREBASE_PROJECT_ID,
      initialized: getApps().length > 0,
      environment: process.env.NODE_ENV || 'development',
      projectId: process.env.FIREBASE_PROJECT_ID || 'not_set'
    }
  },

  async sendNotification(fcmToken: string, payload: {
    title: string
    body: string
    data?: Record<string, any>
    badge?: number
    sound?: string
    category?: string
    threadId?: string
  }) {
    const result = await sendFCMMessage(
      fcmToken,
      { title: payload.title, body: payload.body },
      payload.data,
      {
        payload: {
          aps: {
            badge: payload.badge || 1,
            sound: payload.sound || 'default',
            ...(payload.category && { category: payload.category }),
            ...(payload.threadId && { 'thread-id': payload.threadId })
          }
        }
      }
    )
    return result.success
  },

  async sendNotificationToUser(userId: string, payload: {
    title: string
    body: string
    data?: Record<string, any>
    badge?: number
    sound?: string
    category?: string
    threadId?: string
  }) {
    // This would need to fetch user's device tokens from the database
    // For now, return a placeholder response
    return {
      success: false,
      sentCount: 0,
      error: 'User device tokens not implemented yet'
    }
  }
}

