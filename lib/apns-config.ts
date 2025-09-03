import { getPayload } from 'payload'
import config from '@/payload.config'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'

// APNs Configuration for iOS Push Notifications
interface APNsConfig {
  keyId: string
  teamId: string
  bundleId: string
  keyPath: string
  environment: 'development' | 'production'
  retryAttempts: number
  retryDelay: number
}

// APNs Token Generator with caching
class APNsTokenGenerator {
  private config: APNsConfig
  private cachedToken: string | null = null
  private tokenExpiry: number = 0

  constructor(config: APNsConfig) {
    this.config = config
  }

  private isTokenValid(): boolean {
    return this.cachedToken !== null && Date.now() < this.tokenExpiry
  }

  async generateToken(): Promise<string> {
    try {
      // Return cached token if still valid
      if (this.isTokenValid()) {
        return this.cachedToken!
      }

      // Validate configuration
      this.validateConfig()

      // Read the private key file
      const privateKey = fs.readFileSync(this.config.keyPath, 'utf8')
      
      // Generate JWT token for APNs
      const token = jwt.sign({}, privateKey, {
        algorithm: 'ES256',
        header: {
          alg: 'ES256',
          kid: this.config.keyId
        },
        issuer: this.config.teamId,
        expiresIn: '55m' // Set to 55 minutes to ensure we refresh before expiry
      })

      // Cache the token
      this.cachedToken = token
      this.tokenExpiry = Date.now() + (55 * 60 * 1000) // 55 minutes

      console.log('🔑 APNs token generated and cached')
      return token

    } catch (error) {
      console.error('❌ Error generating APNs token:', error)
      
      // Clear cached token on error
      this.cachedToken = null
      this.tokenExpiry = 0
      
      throw new Error(`Failed to generate APNs authentication token: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private validateConfig(): void {
    const errors: string[] = []

    if (!this.config.keyId) errors.push('APN_KEY_ID is not set')
    if (!this.config.teamId) errors.push('APN_TEAM_ID is not set')
    if (!this.config.bundleId) errors.push('APN_BUNDLE_ID is not set')
    if (!this.config.keyPath) errors.push('APN_KEY_PATH is not set')

    if (this.config.keyPath && !fs.existsSync(this.config.keyPath)) {
      errors.push(`APNs key file not found at: ${this.config.keyPath}`)
    }

    if (errors.length > 0) {
      throw new Error(`APNs configuration errors: ${errors.join(', ')}`)
    }
  }
}

// APNs Notification Sender with enhanced features
export class APNsNotificationSender {
  private tokenGenerator: APNsTokenGenerator
  private config: APNsConfig
  private isInitialized: boolean = false

  constructor() {
    this.config = {
      keyId: process.env.APN_KEY_ID || '',
      teamId: process.env.APN_TEAM_ID || '',
      bundleId: process.env.APN_BUNDLE_ID || 'com.sacavia.app',
      keyPath: process.env.APN_KEY_PATH || '',
      environment: (process.env.NODE_ENV === 'production' ? 'production' : 'development') as 'development' | 'production',
      retryAttempts: parseInt(process.env.APN_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.APN_RETRY_DELAY || '1000')
    }

    this.tokenGenerator = new APNsTokenGenerator(this.config)
    this.initialize()
  }

  private initialize(): void {
    try {
      // Validate configuration on startup
      this.tokenGenerator.generateToken().then(() => {
        this.isInitialized = true
        console.log('✅ APNs configuration initialized successfully')
        console.log(`   Environment: ${this.config.environment}`)
        console.log(`   Bundle ID: ${this.config.bundleId}`)
        console.log(`   Key ID: ${this.config.keyId}`)
      }).catch((error) => {
        console.error('❌ APNs configuration failed to initialize:', error.message)
        this.isInitialized = false
      })
    } catch (error) {
      console.error('❌ APNs initialization error:', error)
      this.isInitialized = false
    }
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.config.retryAttempts
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (attempt === maxAttempts) {
          throw lastError
        }

        console.log(`⚠️ APNs operation failed (attempt ${attempt}/${maxAttempts}), retrying in ${this.config.retryDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay))
      }
    }

    throw lastError!
  }

  async sendNotification(deviceToken: string, payload: {
    title: string
    body: string
    data?: Record<string, any>
    badge?: number
    sound?: string
    category?: string
    threadId?: string
  }): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('❌ APNs not initialized, cannot send notification')
      return false
    }

    return this.retryOperation(async () => {
      const token = await this.tokenGenerator.generateToken()
      
      const apnsPayload = {
        aps: {
          alert: {
            title: payload.title,
            body: payload.body
          },
          badge: payload.badge || 1,
          sound: payload.sound || 'default',
          'content-available': 1,
          ...(payload.category && { category: payload.category }),
          ...(payload.threadId && { 'thread-id': payload.threadId })
        },
        ...payload.data
      }

      const url = this.config.environment === 'production' 
        ? 'https://api.push.apple.com/3/device/'
        : 'https://api.sandbox.push.apple.com/3/device/'

      const response = await fetch(`${url}${deviceToken}`, {
        method: 'POST',
        headers: {
          'Authorization': `bearer ${token}`,
          'apns-topic': this.config.bundleId,
          'Content-Type': 'application/json',
          'apns-push-type': 'alert'
        },
        body: JSON.stringify(apnsPayload)
      })

      if (response.ok) {
        console.log(`✅ APNs notification sent successfully to ${deviceToken.substring(0, 20)}...`)
        return true
      } else {
        const errorData = await response.text()
        const errorMessage = `APNs notification failed: ${response.status} - ${errorData}`
        console.error(`❌ ${errorMessage}`)
        
        // Handle specific APNs errors
        if (response.status === 410) {
          console.log('🔄 Device token is no longer valid, should be removed from database')
        } else if (response.status === 400) {
          console.log('⚠️ Bad request - check payload format')
        } else if (response.status === 403) {
          console.log('🔒 Authentication failed - check APNs configuration')
        }
        
        throw new Error(errorMessage)
      }
    })
  }

  async sendNotificationToUser(userId: string, payload: {
    title: string
    body: string
    data?: Record<string, any>
    badge?: number
    sound?: string
    category?: string
    threadId?: string
  }): Promise<{
    success: boolean
    sentCount: number
    totalCount: number
    errors: string[]
  }> {
    if (!this.isInitialized) {
      console.error('❌ APNs not initialized, cannot send notification to user')
      return { success: false, sentCount: 0, totalCount: 0, errors: ['APNs not initialized'] }
    }

    try {
      const payloadInstance = await getPayload({ config })

      // Get user's device tokens
      const deviceTokens = await payloadInstance.find({
        collection: 'deviceTokens',
        where: {
          and: [
            { user: { equals: String(userId) } },
            { isActive: { equals: true } }
          ]
        }
      })

      if (deviceTokens.docs.length === 0) {
        console.log(`📱 No device tokens found for user ${userId}`)
        return { success: false, sentCount: 0, totalCount: 0, errors: ['No device tokens found'] }
      }

      let successCount = 0
      const errors: string[] = []

      for (const deviceToken of deviceTokens.docs) {
        try {
          const success = await this.sendNotification(deviceToken.token, payload)
          if (success) {
            successCount++
          } else {
            errors.push(`Failed to send to device ${deviceToken.token.substring(0, 20)}...`)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`Error sending to device ${deviceToken.token.substring(0, 20)}...: ${errorMessage}`)
        }
      }

      const result = {
        success: successCount > 0,
        sentCount: successCount,
        totalCount: deviceTokens.docs.length,
        errors
      }

      console.log(`📱 APNs notifications sent to ${successCount}/${deviceTokens.docs.length} devices for user ${userId}`)
      if (errors.length > 0) {
        console.log(`⚠️ Errors: ${errors.length} failures`)
      }

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Error sending APNs notification to user:', errorMessage)
      return { 
        success: false, 
        sentCount: 0, 
        totalCount: 0, 
        errors: [`Database error: ${errorMessage}`] 
      }
    }
  }

  // Utility method to check if APNs is properly configured
  isConfigured(): boolean {
    return this.isInitialized && 
           !!this.config.keyId && 
           !!this.config.teamId && 
           !!this.config.bundleId && 
           !!this.config.keyPath &&
           fs.existsSync(this.config.keyPath)
  }

  // Get configuration status
  getStatus(): {
    configured: boolean
    initialized: boolean
    environment: string
    bundleId: string
    keyId: string
    teamId: string
    keyPath: string
    keyExists: boolean
  } {
    return {
      configured: this.isConfigured(),
      initialized: this.isInitialized,
      environment: this.config.environment,
      bundleId: this.config.bundleId,
      keyId: this.config.keyId,
      teamId: this.config.teamId,
      keyPath: this.config.keyPath,
      keyExists: fs.existsSync(this.config.keyPath)
    }
  }
}

// Export singleton instance
export const apnsSender = new APNsNotificationSender()

// Standalone function for sending APNs notifications
export async function sendAPNsNotification(
  deviceToken: string,
  payload: {
    title: string
    body: string
    data?: Record<string, any>
    badge?: number
    sound?: string
    category?: string
    threadId?: string
  }
): Promise<boolean> {
  try {
    const sender = new APNsNotificationSender()
    return await sender.sendNotification(deviceToken, payload)
  } catch (error) {
    console.error('❌ Error in sendAPNsNotification:', error)
    return false
  }
}
