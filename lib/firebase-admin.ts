import admin from 'firebase-admin'

// Firebase Admin SDK Configuration
// This replaces the APNs configuration for sending push notifications

interface FirebaseConfig {
  projectId: string
  privateKeyId: string
  privateKey: string
  clientEmail: string
  clientId: string
  authUri: string
  tokenUri: string
  authProviderX509CertUrl: string
  clientX509CertUrl: string
}

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App

try {
  // Check if Firebase is already initialized
  if (admin.apps.length === 0) {
    // Get Firebase service account from environment variables
    const serviceAccount: FirebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID || '',
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
      clientId: process.env.FIREBASE_CLIENT_ID || '',
      authUri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      tokenUri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL || ''
    }

    // Validate required fields
    const requiredFields = ['projectId', 'privateKey', 'clientEmail']
    const missingFields = requiredFields.filter(field => !serviceAccount[field as keyof FirebaseConfig])
    
    if (missingFields.length > 0) {
      console.warn(`⚠️ Firebase Admin SDK not configured. Missing fields: ${missingFields.join(', ')}`)
      console.warn('📱 Push notifications will use APNs fallback')
    } else {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: serviceAccount.projectId
      })
      
      console.log('✅ Firebase Admin SDK initialized successfully')
      console.log(`📱 Project ID: ${serviceAccount.projectId}`)
    }
  } else {
    firebaseApp = admin.app()
    console.log('✅ Firebase Admin SDK already initialized')
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error)
  console.warn('📱 Push notifications will use APNs fallback')
}

// Firebase Notification Sender
export class FirebaseNotificationSender {
  private isInitialized: boolean = false

  constructor() {
    this.isInitialized = admin.apps.length > 0
  }

  getStatus() {
    return {
      configured: this.isInitialized,
      initialized: this.isInitialized,
      environment: process.env.NODE_ENV || 'development',
      projectId: process.env.FIREBASE_PROJECT_ID || 'not_set'
    }
  }

  async sendNotification(fcmToken: string, payload: {
    title: string
    body: string
    data?: Record<string, any>
    badge?: number
    sound?: string
    category?: string
    threadId?: string
  }): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('❌ Firebase not initialized, cannot send notification')
      return false
    }

    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body
        },
        data: {
          ...payload.data,
          timestamp: Date.now().toString()
        },
        android: {
          notification: {
            sound: payload.sound || 'default',
            channelId: 'sacavia_notifications'
          }
        },
        apns: {
          payload: {
            aps: {
              badge: payload.badge || 1,
              sound: payload.sound || 'default',
              'content-available': 1,
              ...(payload.category && { category: payload.category }),
              ...(payload.threadId && { 'thread-id': payload.threadId })
            }
          }
        }
      }

      const response = await admin.messaging().send(message)
      console.log(`✅ Firebase notification sent successfully: ${response}`)
      return true
    } catch (error) {
      console.error('❌ Failed to send Firebase notification:', error)
      return false
    }
  }

  async sendNotificationToUser(userId: string, payload: {
    title: string
    body: string
    data?: Record<string, any>
    badge?: number
    sound?: string
    category?: string
    threadId?: string
  }): Promise<{ success: boolean; sentCount: number; error?: string }> {
    if (!this.isInitialized) {
      return {
        success: false,
        sentCount: 0,
        error: 'Firebase not initialized'
      }
    }

    try {
      const { getPayload } = await import('payload')
      const config = await import('@/payload.config')
      const payloadInstance = await getPayload({ config: config.default })

      // Get user's FCM tokens from deviceTokens collection
      const deviceTokens = await payloadInstance.find({
        collection: 'deviceTokens',
        where: {
          and: [
            { user: { equals: userId } },
            { isActive: { equals: true } }
          ]
        }
      })

      if (deviceTokens.docs.length === 0) {
        return {
          success: false,
          sentCount: 0,
          error: 'No active device tokens found for user'
        }
      }

      let sentCount = 0
      const errors: string[] = []

              // Send to all user's devices
        for (const deviceToken of deviceTokens.docs) {
          try {
            const success = await this.sendNotification(deviceToken.deviceToken, payload)
          if (success) {
            sentCount++
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(errorMessage)
          console.error(`Failed to send to token ${deviceToken.token}:`, error)
        }
      }

      return {
        success: sentCount > 0,
        sentCount,
        error: errors.length > 0 ? errors.join(', ') : undefined
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error sending notification to user:', error)
      return {
        success: false,
        sentCount: 0,
        error: errorMessage
      }
    }
  }

  async sendNotificationToMultipleUsers(userIds: string[], payload: {
    title: string
    body: string
    data?: Record<string, any>
    badge?: number
    sound?: string
    category?: string
    threadId?: string
  }): Promise<{ success: number; failed: number; total: number }> {
    if (!this.isInitialized) {
      return { success: 0, failed: userIds.length, total: userIds.length }
    }

    let successCount = 0
    let failedCount = 0

    for (const userId of userIds) {
      try {
        const result = await this.sendNotificationToUser(userId, payload)
        if (result.success) {
          successCount += result.sentCount
        } else {
          failedCount++
        }
      } catch (error) {
        failedCount++
        console.error(`Failed to send notification to user ${userId}:`, error)
      }
    }

    return {
      success: successCount,
      failed: failedCount,
      total: userIds.length
    }
  }
}

// Export singleton instance
export const firebaseSender = new FirebaseNotificationSender()

// Export admin instance for direct use if needed
export { admin }
