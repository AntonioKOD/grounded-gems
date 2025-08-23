import { getPayload } from 'payload'
import config from '@/payload.config'

export interface NotificationData {
  recipient: string
  type: string
  title: string
  message?: string
  relatedTo?: {
    relationTo: string
    value: string
  }
  actionBy?: string
  metadata?: Record<string, any>
  priority?: 'low' | 'normal' | 'high'
  read?: boolean
}

/**
 * Centralized notification service that prevents duplicates
 */
export class NotificationService {
  private static instance: NotificationService
  private duplicateCheckCache = new Map<string, number>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * Create a notification with duplicate prevention
   */
  async createNotification(data: NotificationData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const payload = await getPayload({ config })
      
      // Create a unique key for duplicate checking
      const duplicateKey = this.createDuplicateKey(data)
      
      // Check if we've recently created this notification
      if (this.isDuplicate(duplicateKey)) {
        console.log(`⚠️ [NotificationService] Skipping duplicate notification: ${data.type} for ${data.recipient}`)
        return { success: false, error: 'Duplicate notification prevented' }
      }

      // Check database for existing notification in the last 24 hours
      const existingNotification = await payload.find({
        collection: 'notifications',
        where: {
          and: [
            { recipient: { equals: data.recipient } },
            { type: { equals: data.type } },
            { createdAt: { greater_than: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() } }
          ]
        },
        limit: 1
      })

      // If it's a follow notification, also check the specific follower
      if (data.type === 'follow' && data.metadata?.followerId) {
        const followNotification = await payload.find({
          collection: 'notifications',
          where: {
            and: [
              { recipient: { equals: data.recipient } },
              { type: { equals: 'follow' } },
              { 'metadata.followerId': { equals: data.metadata.followerId } },
              { createdAt: { greater_than: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() } }
            ]
          },
          limit: 1
        })

        if (followNotification.docs.length > 0) {
          console.log(`⚠️ [NotificationService] Follow notification already exists for ${data.recipient} from ${data.metadata.followerId}`)
          return { success: false, error: 'Follow notification already exists' }
        }
      }

      // If it's a location interaction notification, check for recent similar interactions
      if (data.type.includes('location_') && data.relatedTo?.value) {
        const locationNotification = await payload.find({
          collection: 'notifications',
          where: {
            and: [
              { recipient: { equals: data.recipient } },
              { type: { equals: data.type } },
              { 'relatedTo.value': { equals: data.relatedTo.value } },
              { createdAt: { greater_than: new Date(Date.now() - 60 * 60 * 1000).toISOString() } } // Last hour
            ]
          },
          limit: 1
        })

        if (locationNotification.docs.length > 0) {
          console.log(`⚠️ [NotificationService] Location notification already exists for ${data.recipient} on ${data.relatedTo.value}`)
          return { success: false, error: 'Location notification already exists' }
        }
      }

      // Create the notification
      const notification = await payload.create({
        collection: 'notifications',
        data: {
          ...data,
          read: data.read ?? false,
          createdAt: new Date(),
        },
      })

      // Mark as created in cache to prevent immediate duplicates
      this.markAsCreated(duplicateKey)

      console.log(`✅ [NotificationService] Created notification: ${data.type} for ${data.recipient}`)
      return { success: true, id: String(notification.id) }

    } catch (error) {
      console.error('Error creating notification:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Create a unique key for duplicate checking
   */
  private createDuplicateKey(data: NotificationData): string {
    const base = `${data.recipient}_${data.type}`
    
    if (data.type === 'follow' && data.metadata?.followerId) {
      return `${base}_${data.metadata.followerId}`
    }
    
    if (data.relatedTo?.value) {
      return `${base}_${data.relatedTo.value}`
    }
    
    return base
  }

  /**
   * Check if this notification is a duplicate
   */
  private isDuplicate(key: string): boolean {
    const timestamp = this.duplicateCheckCache.get(key)
    if (!timestamp) return false
    
    // Check if the cache entry is still valid
    if (Date.now() - timestamp > this.CACHE_TTL) {
      this.duplicateCheckCache.delete(key)
      return false
    }
    
    return true
  }

  /**
   * Mark a notification as created to prevent duplicates
   */
  private markAsCreated(key: string): void {
    this.duplicateCheckCache.set(key, Date.now())
    
    // Clean up old entries
    const now = Date.now()
    for (const [cacheKey, timestamp] of this.duplicateCheckCache.entries()) {
      if (now - timestamp > this.CACHE_TTL) {
        this.duplicateCheckCache.delete(cacheKey)
      }
    }
  }

  /**
   * Clear the duplicate check cache
   */
  clearCache(): void {
    this.duplicateCheckCache.clear()
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance()
