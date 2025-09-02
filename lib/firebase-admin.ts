import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    try {
      console.log('🚀 [Firebase] Starting Firebase Admin initialization...')
      
      // Try to use the full service account JSON first
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        console.log('🔐 [Firebase] Using service account JSON from environment variable')
        try {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
          console.log('🔐 [Firebase] Parsed service account:', {
            project_id: serviceAccount.project_id,
            client_email: serviceAccount.client_email,
            private_key_length: serviceAccount.private_key?.length || 0
          })
          
          // Check if APNs configuration is available
          const apnsConfig = {
            keyId: process.env.APN_KEY_ID,
            teamId: process.env.APN_TEAM_ID,
            keyPath: process.env.APN_KEY_PATH,
            bundleId: process.env.APN_BUNDLE_ID
          }
          
          console.log('🔐 [Firebase] APNs configuration details:')
          console.log(`  - Key ID: ${apnsConfig.keyId || 'NOT_SET'}`)
          console.log(`  - Team ID: ${apnsConfig.teamId || 'NOT_SET'}`)
          console.log(`  - Key Path: ${apnsConfig.keyPath || 'NOT_SET'}`)
          console.log(`  - Bundle ID: ${apnsConfig.bundleId || 'NOT_SET'}`)
          
          // Validate APNs configuration
          const apnsValidation = {
            keyId: !!apnsConfig.keyId && apnsConfig.keyId.length > 0,
            teamId: !!apnsConfig.teamId && apnsConfig.teamId.length > 0,
            keyPath: !!apnsConfig.keyPath && apnsConfig.keyPath.length > 0,
            bundleId: !!apnsConfig.bundleId && apnsConfig.bundleId.length > 0
          }
          
          console.log('🔐 [Firebase] APNs validation results:')
          console.log(`  - Key ID valid: ${apnsValidation.keyId}`)
          console.log(`  - Team ID valid: ${apnsValidation.teamId}`)
          console.log(`  - Key Path valid: ${apnsValidation.keyPath}`)
          console.log(`  - Bundle ID valid: ${apnsValidation.bundleId}`)
          
          // Check if key file exists
          if (apnsConfig.keyPath) {
            try {
              const fs = require('fs')
              const keyExists = fs.existsSync(apnsConfig.keyPath)
              console.log(`🔐 [Firebase] APNs key file exists: ${keyExists}`)
              if (keyExists) {
                const stats = fs.statSync(apnsConfig.keyPath)
                console.log(`🔐 [Firebase] APNs key file size: ${stats.size} bytes`)
                console.log(`🔐 [Firebase] APNs key file permissions: ${stats.mode.toString(8)}`)
              }
            } catch (fsError) {
              console.log(`🔐 [Firebase] Could not check APNs key file: ${fsError}`)
            }
          }
          
          // Initialize with APNs configuration if available
          const appOptions: any = {
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID,
          }
          
          // Add APNs configuration if available
          if (apnsValidation.keyId && apnsValidation.teamId && apnsValidation.keyPath) {
            console.log('🔐 [Firebase] Adding APNs configuration to Firebase Admin')
            console.log('🔐 [Firebase] APNs config object:', {
              keyId: apnsConfig.keyId,
              teamId: apnsConfig.teamId,
              keyPath: apnsConfig.keyPath,
              bundleId: apnsConfig.bundleId || 'com.sacavia.app'
            })
            
            appOptions.messaging = {
              apns: {
                keyId: apnsConfig.keyId,
                teamId: apnsConfig.teamId,
                keyPath: apnsConfig.keyPath,
                bundleId: apnsConfig.bundleId || 'com.sacavia.app'
              }
            }
            
            console.log('🔐 [Firebase] Final app options:', JSON.stringify(appOptions, null, 2))
          } else {
            console.log('⚠️ [Firebase] APNs configuration incomplete, skipping APNs setup')
            console.log('⚠️ [Firebase] Missing:', Object.entries(apnsValidation).filter(([_, valid]) => !valid).map(([key, _]) => key))
          }
          
          console.log('🔐 [Firebase] Calling initializeApp with options...')
          const app = initializeApp(appOptions)
          console.log('🔐 [Firebase] Firebase app initialized:', app.name)
          
          console.log('✅ [Firebase] Initialized with service account JSON and APNs config')
          return
        } catch (parseError) {
          console.error('❌ [Firebase] Failed to parse service account JSON:', parseError)
          throw new Error(`Failed to parse Firebase service account JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
        }
      }

      // Fallback to individual environment variables
      console.log('🔐 [Firebase] Using individual environment variables')
      
      const serviceAccount: ServiceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID || '',
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
      }

      // Validate required fields
      if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
        const missingFields = []
        if (!serviceAccount.projectId) missingFields.push('FIREBASE_PROJECT_ID')
        if (!serviceAccount.privateKey) missingFields.push('FIREBASE_PRIVATE_KEY')
        if (!serviceAccount.clientEmail) missingFields.push('FIREBASE_CLIENT_EMAIL')
        
        throw new Error(`Missing required Firebase service account configuration: ${missingFields.join(', ')}`)
      }

      // Log configuration (without sensitive data)
      console.log('🔐 [Firebase] Configuration:')
      console.log(`  - Project ID: ${serviceAccount.projectId}`)
      console.log(`  - Client Email: ${serviceAccount.clientEmail}`)
      console.log(`  - Private Key: ${serviceAccount.privateKey ? '✅ Set' : '❌ Missing'}`)

      initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      })
      
      console.log('✅ [Firebase] Initialized with environment variables')
      
    } catch (error) {
      console.error('❌ [Firebase] Failed to initialize:', error)
      throw new Error(`Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  } else {
    console.log('✅ [Firebase] Already initialized')
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
    console.log('🚀 [FCM] Starting FCM message send...')
    console.log(`🚀 [FCM] Token: ${token.substring(0, 20)}...`)
    console.log(`🚀 [FCM] Notification: ${notification.title} - ${notification.body}`)
    
    const messaging = getFirebaseMessaging()
    console.log('✅ [FCM] Got Firebase Messaging instance')

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

    console.log('🚀 [FCM] Message object prepared:', JSON.stringify(message, null, 2))
    console.log('🚀 [FCM] Attempting to send message...')
    
    const response = await messaging.send(message)
    console.log('✅ [FCM] Message sent successfully:', response)
    return { success: true, messageId: response }
  } catch (error) {
    console.error('❌ [FCM] Error sending FCM message:', error)
    console.error('❌ [FCM] Error type:', error?.constructor?.name)
    console.error('❌ [FCM] Error message:', (error as any)?.message)
    console.error('❌ [FCM] Error stack:', (error as any)?.stack)
    
    // Log additional Firebase error details
    if (error && typeof error === 'object') {
      console.error('❌ [FCM] Error properties:', Object.keys(error))
      console.error('❌ [FCM] Error info:', (error as any).errorInfo)
      console.error('❌ [FCM] Error code:', (error as any).code)
      console.error('❌ [FCM] Error codePrefix:', (error as any).codePrefix)
    }
    
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

