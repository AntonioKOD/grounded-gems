import { getPayload } from 'payload'
import config from '@/payload.config'
import jwt from 'jsonwebtoken'
import fs from 'fs'

// APNs Configuration for iOS Push Notifications
interface APNsConfig {
  keyId: string
  teamId: string
  bundleId: string
  keyPath: string
  environment: 'development' | 'production'
}

// APNs Token Generator
class APNsTokenGenerator {
  private config: APNsConfig

  constructor(config: APNsConfig) {
    this.config = config
  }

  async generateToken(): Promise<string> {
    try {
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
        expiresIn: '1h'
      })

      return token
    } catch (error) {
      console.error('Error generating APNs token:', error)
      throw new Error('Failed to generate APNs authentication token')
    }
  }
}

// APNs Notification Sender
export class APNsNotificationSender {
  private tokenGenerator: APNsTokenGenerator
  private config: APNsConfig

  constructor() {
    this.config = {
      keyId: process.env.APN_KEY_ID || '',
      teamId: process.env.APN_TEAM_ID || '',
      bundleId: 'com.sacavia.app',
      keyPath: process.env.APN_KEY_PATH || '',
      environment: (process.env.NODE_ENV === 'production' ? 'production' : 'development') as 'development' | 'production'
    }

    this.tokenGenerator = new APNsTokenGenerator(this.config)
  }

  async sendNotification(deviceToken: string, payload: {
    title: string
    body: string
    data?: Record<string, any>
    badge?: number
    sound?: string
  }): Promise<boolean> {
    try {
      const token = await this.tokenGenerator.generateToken()
      
      const apnsPayload = {
        aps: {
          alert: {
            title: payload.title,
            body: payload.body
          },
          badge: payload.badge || 1,
          sound: payload.sound || 'default',
          'content-available': 1
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apnsPayload)
      })

      if (response.ok) {
        console.log(`✅ APNs notification sent successfully to ${deviceToken}`)
        return true
      } else {
        const errorData = await response.text()
        console.error(`❌ APNs notification failed: ${response.status} - ${errorData}`)
        return false
      }

    } catch (error) {
      console.error('❌ APNs notification error:', error)
      return false
    }
  }

  async sendNotificationToUser(userId: string, payload: {
    title: string
    body: string
    data?: Record<string, any>
    badge?: number
    sound?: string
  }): Promise<boolean> {
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
        console.log(`No device tokens found for user ${userId}`)
        return false
      }

      let successCount = 0
      for (const deviceToken of deviceTokens.docs) {
        const success = await this.sendNotification(deviceToken.token, payload)
        if (success) successCount++
      }

      console.log(`APNs notifications sent to ${successCount}/${deviceTokens.docs.length} devices for user ${userId}`)
      return successCount > 0

    } catch (error) {
      console.error('Error sending APNs notification to user:', error)
      return false
    }
  }
}

// Export singleton instance
export const apnsSender = new APNsNotificationSender()
