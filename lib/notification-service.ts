import { sendFCMMessage } from './firebase-admin'
import { getPayload } from 'payload'
import config from '@/payload.config'

export interface NotificationPayload {
  title: string
  body: string
  imageUrl?: string
  data?: Record<string, string>
  apns?: {
    payload?: Record<string, any>
    headers?: Record<string, string>
  }
}

export interface UserNotification extends NotificationPayload {
  userId: string
}

export interface BulkNotification extends NotificationPayload {
  userIds: string[]
}

export interface NotificationData {
  recipient: string
  type: string
  title: string
  message?: string
  metadata?: Record<string, any>
  read?: boolean
  relatedTo?: {
    relationTo: string
    value: string
  }
  actionBy?: string
  priority?: 'low' | 'normal' | 'high'
  actionRequired?: boolean
}

export class NotificationService {
  /**
   * Convert metadata values to strings for FCM compatibility
   * FCM requires all data values to be strings
   */
  private static convertMetadataToStrings(metadata: Record<string, any>): Record<string, string> {
    const stringMetadata: Record<string, string> = {}
    
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== null && value !== undefined) {
        stringMetadata[key] = String(value)
      } else {
        stringMetadata[key] = ''
      }
    }
    
    return stringMetadata
  }

  /**
   * Create a notification in the database AND send push notification
   */
  static async createNotification(data: NotificationData) {
    try {
      const payload = await getPayload({ config })
      
      // Create notification in database
      const notification = await payload.create({
        collection: 'notifications',
        data: {
          recipient: data.recipient,
          type: data.type,
          title: data.title,
          message: data.message,
          metadata: data.metadata,
          read: data.read || false,
          relatedTo: data.relatedTo,
          actionBy: data.actionBy,
          priority: data.priority || 'normal',
          actionRequired: data.actionRequired || false,
        },
      })

      console.log(`✅ [NotificationService] Created ${data.type} notification for user ${data.recipient}`)

      // Send push notification to user's devices
      await this.sendPushNotificationToUser(data.recipient, {
        title: data.title,
        body: data.message || data.title,
        data: {
          notificationId: String(notification.id),
          type: data.type,
          ...this.convertMetadataToStrings(data.metadata || {})
        }
      })

      return {
        success: true,
        id: notification.id,
        message: 'Notification created and sent successfully'
      }
    } catch (error) {
      console.error('Error creating notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Send push notification to a single user
   */
  static async sendToUser(notification: UserNotification) {
    try {
      // Send notification using the push API
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'user',
          target: notification.userId,
          notification: {
            title: notification.title,
            body: notification.body,
            imageUrl: notification.imageUrl
          },
          data: notification.data,
          apns: notification.apns
        }),
      })

      return await response.json()
    } catch (error) {
      console.error('Error sending notification to user:', error)
      throw error
    }
  }

  /**
   * Send push notification to multiple users
   */
  static async sendToUsers(notification: BulkNotification) {
    try {
      const results = []
      
      for (const userId of notification.userIds) {
        const result = await this.sendToUser({
          ...notification,
          userId
        })
        results.push({ userId, result })
      }

      return {
        success: true,
        results,
        totalSent: results.length
      }
    } catch (error) {
      console.error('Error sending notifications to users:', error)
      throw error
    }
  }

  /**
   * Send push notification to all users
   */
  static async sendToAll(notification: NotificationPayload) {
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'topic',
          topic: 'all_users',
          notification: {
            title: notification.title,
            body: notification.body,
            imageUrl: notification.imageUrl
          },
          data: notification.data,
          apns: notification.apns
        }),
      })

      return await response.json()
    } catch (error) {
      console.error('Error sending notification to all users:', error)
      throw error
    }
  }

  /**
   * Send push notification directly to a user's devices
   */
  static async sendPushNotificationToUser(userId: string, notification: NotificationPayload) {
    try {
      const payload = await getPayload({ config })
      
      // Get all active device tokens for the user
      const deviceTokens = await payload.find({
        collection: 'deviceTokens',
        where: {
          and: [
            { user: { equals: userId } },
            { isActive: { equals: true } }
          ]
        },
        limit: 100
      })

      if (deviceTokens.docs.length === 0) {
        console.log(`📱 [NotificationService] No active device tokens found for user ${userId}`)
        return { success: false, message: 'No active devices found' }
      }

      console.log(`📱 [NotificationService] Sending push notification to ${deviceTokens.docs.length} devices for user ${userId}`)
      
      let successCount = 0
      let failedCount = 0
      
      // Send push notification to all user's devices
      for (const tokenDoc of deviceTokens.docs) {
        try {
          // Determine token type and send accordingly
          // For iOS, prioritize FCM token since that's what the app registers
          let token = null
          const platform = tokenDoc.platform || 'ios'
          
          if (platform === 'ios') {
            // iOS app registers FCM tokens, so use that first
            token = tokenDoc.fcmToken || tokenDoc.deviceToken || tokenDoc.apnsToken
          } else {
            // For other platforms, use deviceToken first
            token = tokenDoc.deviceToken || tokenDoc.fcmToken || tokenDoc.apnsToken
          }
          
          if (!token) {
            console.log(`⚠️ [NotificationService] No valid token found for device ${tokenDoc.id}`)
            continue
          }

          console.log(`📱 [NotificationService] Sending to device ${tokenDoc.id} (${platform}) with token: ${token.substring(0, 20)}...`)
          
          // For iOS devices, always try FCM first since that's what the app registers
          if (platform === 'ios') {
            try {
              // Send via FCM for iOS devices (this is what the app registers)
              const fcmData = this.convertMetadataToStrings(notification.data || {})
              const result = await sendFCMMessage(
                token,
                {
                  title: notification.title,
                  body: notification.body,
                  imageUrl: notification.imageUrl
                },
                fcmData,
                {
                  payload: {
                    aps: {
                      badge: 1,
                      sound: 'default',
                      'content-available': 1
                    }
                  }
                }
              )
              
              if (result.success) {
                successCount++
                console.log(`✅ [NotificationService] FCM notification sent to iOS device ${tokenDoc.id}`)
              } else {
                failedCount++
                console.log(`❌ [NotificationService] Failed to send FCM notification to iOS device ${tokenDoc.id}: ${result.error}`)
                
                // Check if this is an invalid token error
                if (result.error && (
                  result.error.includes('invalid-argument') ||
                  result.error.includes('not a valid FCM registration token') ||
                  result.error.includes('registration token is not valid')
                )) {
                  console.log(`🚨 [NotificationService] Invalid FCM token detected for device ${tokenDoc.id}, marking for cleanup`)
                  await this.deactivateToken(String(tokenDoc.id), 'Invalid FCM token - automatically deactivated')
                }
              }
            } catch (fcmError) {
              console.warn(`⚠️ [NotificationService] FCM failed for iOS device ${tokenDoc.id}, trying APNs fallback:`, fcmError)
              
              // Check if this is an invalid token error
              const errorMessage = fcmError instanceof Error ? fcmError.message : String(fcmError)
              if (errorMessage.includes('invalid-argument') ||
                  errorMessage.includes('not a valid FCM registration token') ||
                  errorMessage.includes('registration token is not valid')) {
                console.log(`🚨 [NotificationService] Invalid FCM token detected for device ${tokenDoc.id}, marking for cleanup`)
                await this.deactivateToken(String(tokenDoc.id), 'Invalid FCM token - automatically deactivated')
              }
              
              // Fallback to APNs if FCM fails and APNs token is available
              if (tokenDoc.apnsToken) {
                try {
                  const { sendAPNsNotification } = await import('@/lib/apns-config')
                  const apnsResult = await sendAPNsNotification(tokenDoc.apnsToken, {
                    title: notification.title,
                    body: notification.body,
                    data: notification.data || {},
                    badge: 1,
                    sound: 'default'
                  })
                  
                  if (apnsResult) {
                    successCount++
                    console.log(`✅ [NotificationService] APNs fallback successful for device ${tokenDoc.id}`)
                  } else {
                    failedCount++
                    console.log(`❌ [NotificationService] APNs fallback failed for device ${tokenDoc.id}`)
                  }
                } catch (apnsError) {
                  failedCount++
                  console.error(`❌ [NotificationService] Both FCM and APNs failed for iOS device ${tokenDoc.id}:`, apnsError)
                }
              } else {
                failedCount++
                console.error(`❌ [NotificationService] FCM failed and no APNs token available for device ${tokenDoc.id}`)
              }
            }
          } else {
            // Send via FCM for other platforms
            const fcmData = this.convertMetadataToStrings(notification.data || {})
            const result = await sendFCMMessage(
              token,
              {
                title: notification.title,
                body: notification.body,
                imageUrl: notification.imageUrl
              },
              fcmData,
              notification.apns
            )
            
            if (result.success) {
              successCount++
              console.log(`✅ [NotificationService] FCM notification sent to ${platform} device ${tokenDoc.id}`)
            } else {
              failedCount++
              console.log(`❌ [NotificationService] Failed to send FCM notification to ${platform} device ${tokenDoc.id}: ${result.error}`)
              
              // Check if this is an invalid token error
              if (result.error && (
                result.error.includes('invalid-argument') ||
                result.error.includes('not a valid FCM registration token') ||
                result.error.includes('registration token is not valid')
              )) {
                console.log(`🚨 [NotificationService] Invalid FCM token detected for device ${tokenDoc.id}, marking for cleanup`)
                await this.deactivateToken(String(tokenDoc.id), 'Invalid FCM token - automatically deactivated')
              }
            }
          }
        } catch (error) {
          failedCount++
          console.error(`❌ [NotificationService] Error sending push notification to device ${tokenDoc.id}:`, error)
          
          // Check if this is an invalid token error
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (errorMessage.includes('invalid-argument') ||
              errorMessage.includes('not a valid FCM registration token') ||
              errorMessage.includes('registration token is not valid')) {
            console.log(`🚨 [NotificationService] Invalid FCM token detected for device ${tokenDoc.id}, marking for cleanup`)
            await this.deactivateToken(String(tokenDoc.id), 'Invalid FCM token - automatically deactivated')
          }
        }
      }
      
      console.log(`📱 [NotificationService] Push notification results: ${successCount} sent, ${failedCount} failed`)
      
      return {
        success: successCount > 0,
        sentCount: successCount,
        failedCount: failedCount,
        totalDevices: deviceTokens.docs.length
      }
    } catch (error) {
      console.error('Error sending push notification to user:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Create and send follow notification
   */
  static async notifyNewFollower(recipientId: string, followerId: string, followerName: string, followerAvatar?: string) {
    return this.createNotification({
      recipient: recipientId,
      type: 'follow',
      title: 'New Follower! 👥',
      message: `${followerName} started following you`,
      metadata: {
        followerId,
        followerName,
        followerAvatar: followerAvatar || '',
        action: 'view_profile'
      },
      relatedTo: {
        relationTo: 'users',
        value: followerId
      },
      actionBy: followerId,
      priority: 'normal'
    })
  }

  /**
   * Create and send like notification
   */
  static async notifyNewLike(recipientId: string, likerId: string, likerName: string, postId: string, postType: string) {
    return this.createNotification({
      recipient: recipientId,
      type: 'like',
      title: 'New Like! ❤️',
      message: `${likerName} liked your ${postType}`,
      metadata: {
        likerId,
        likerName,
        postId,
        postType,
        action: 'view_post'
      },
      relatedTo: {
        relationTo: postType === 'post' ? 'posts' : 'locations',
        value: postId
      },
      actionBy: likerId,
      priority: 'low'
    })
  }

  /**
   * Create and send comment notification
   */
  static async notifyNewComment(recipientId: string, commenterId: string, commenterName: string, postId: string, postType: string, commentText: string) {
    return this.createNotification({
      recipient: recipientId,
      type: 'comment',
      title: 'New Comment! 💬',
      message: `${commenterName} commented: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
      metadata: {
        commenterId,
        commenterName,
        postId,
        postType,
        commentText,
        action: 'view_post'
      },
      relatedTo: {
        relationTo: postType === 'post' ? 'posts' : 'locations',
        value: postId
      },
      actionBy: commenterId,
      priority: 'normal'
    })
  }

  /**
   * Create and send mention notification
   */
  static async notifyMention(recipientId: string, mentionerId: string, mentionerName: string, postId: string, postType: string) {
    return this.createNotification({
      recipient: recipientId,
      type: 'mention',
      title: 'You were mentioned! @',
      message: `${mentionerName} mentioned you in a ${postType}`,
      metadata: {
        mentionerId,
        mentionerName,
        postId,
        postType,
        action: 'view_post'
      },
      relatedTo: {
        relationTo: postType === 'post' ? 'posts' : 'locations',
        value: postId
      },
      actionBy: mentionerId,
      priority: 'normal'
    })
  }

  /**
   * Create and send location interaction notification
   */
  static async notifyLocationInteraction(recipientId: string, interactorId: string, interactorName: string, locationId: string, locationName: string, interactionType: string) {
    const interactionEmojis: Record<string, string> = {
      'like': '❤️',
      'save': '🔖',
      'share': '📤',
      'check_in': '📍',
      'review': '⭐',
      'subscribe': '🔔'
    }

    const emoji = interactionEmojis[interactionType] || '📱'
    
    // Map interaction types to valid notification types
    const typeMapping: Record<string, string> = {
      'like': 'location_liked',
      'save': 'location_saved',
      'share': 'location_shared',
      'check_in': 'location_visited',
      'review': 'location_reviewed',
      'subscribe': 'location_followed'
    }
    
    const notificationType = typeMapping[interactionType] || 'location_interaction'
    
    return this.createNotification({
      recipient: recipientId,
      type: notificationType,
      title: `Location ${interactionType.charAt(0).toUpperCase() + interactionType.slice(1)}! ${emoji}`,
      message: `${interactorName} ${interactionType.replace('_', ' ')}d your location "${locationName}"`,
      metadata: {
        interactorId,
        interactorName,
        locationId,
        locationName,
        interactionType,
        action: 'view_location'
      },
      relatedTo: {
        relationTo: 'locations',
        value: locationId
      },
      actionBy: interactorId,
      priority: 'normal'
    })
  }

  /**
   * Create and send event request notification
   */
  static async notifyEventRequest(recipientId: string, requesterId: string, requesterName: string, locationId: string, locationName: string, eventTitle: string) {
    return this.createNotification({
      recipient: recipientId,
      type: 'event_request_received',
      title: 'New Event Request! 🎉',
      message: `${requesterName} wants to host "${eventTitle}" at your location "${locationName}"`,
      metadata: {
        requesterId,
        requesterName,
        locationId,
        locationName,
        eventTitle,
        action: 'view_event_request'
      },
      relatedTo: {
        relationTo: 'eventRequests',
        value: locationId
      },
      actionBy: requesterId,
      priority: 'high',
      actionRequired: true
    })
  }

  /**
   * Create and send milestone notification
   */
  static async notifyMilestone(recipientId: string, milestoneType: string, milestoneValue: string, locationId?: string, locationName?: string) {
    return this.createNotification({
      recipient: recipientId,
      type: 'location_milestone',
      title: 'Milestone Reached! 🎯',
      message: `Congratulations! You've reached ${milestoneType}: ${milestoneValue}${locationName ? ` at "${locationName}"` : ''}`,
      metadata: {
        milestoneType,
        milestoneValue,
        locationId: locationId || '',
        locationName: locationName || '',
        action: 'view_milestone'
      },
      relatedTo: locationId ? {
        relationTo: 'locations',
        value: locationId
      } : undefined,
      priority: 'normal'
    })
  }

  /**
   * Create and send journey invite notification
   */
  static async notifyJourneyInvite(recipientId: string, inviterId: string, inviterName: string, journeyId: string, journeyTitle: string) {
    return this.createNotification({
      recipient: recipientId,
      type: 'journey_invite',
      title: 'Journey Invitation! 🗺️',
      message: `${inviterName} invited you to join "${journeyTitle}"`,
      metadata: {
        inviterId,
        inviterName,
        journeyId,
        journeyTitle,
        action: 'view_journey_invite'
      },
      relatedTo: {
        relationTo: 'gemJourneys',
        value: journeyId
      },
      actionBy: inviterId,
      priority: 'high',
      actionRequired: true
    })
  }

  /**
   * Create and send reminder notification
   */
  static async notifyReminder(recipientId: string, reminderType: string, reminderText: string, relatedId?: string, relatedType?: string) {
    return this.createNotification({
      recipient: recipientId,
      type: 'reminder',
      title: 'Reminder! ⏰',
      message: reminderText,
      metadata: {
        reminderType,
        relatedId: relatedId || '',
        relatedType: relatedType || '',
        action: 'view_reminder'
      },
      relatedTo: relatedId && relatedType ? {
        relationTo: relatedType,
        value: relatedId
      } : undefined,
      priority: 'normal'
    })
  }

  /**
   * Validate FCM token format and clean up invalid tokens
   */
  static async validateAndCleanupTokens() {
    try {
      const payload = await getPayload({ config })
      
      console.log('🧹 [NotificationService] Starting token validation and cleanup...')
      
      // Get all active device tokens
      const deviceTokens = await payload.find({
        collection: 'deviceTokens',
        where: {
          isActive: { equals: true }
        },
        limit: 1000
      })
      
      console.log(`🧹 [NotificationService] Found ${deviceTokens.docs.length} active device tokens to validate`)
      
      let validTokens = 0
      let invalidTokens = 0
      let cleanedUpTokens = 0
      
      for (const tokenDoc of deviceTokens.docs) {
        try {
          const platform = tokenDoc.platform || 'ios'
          let token = null
          
          if (platform === 'ios') {
            token = tokenDoc.fcmToken || tokenDoc.deviceToken || tokenDoc.apnsToken
          } else {
            token = tokenDoc.deviceToken || tokenDoc.fcmToken || tokenDoc.apnsToken
          }
          
          if (!token) {
            console.log(`⚠️ [Token Validation] No token found for device ${tokenDoc.id}, marking as inactive`)
            await this.deactivateToken(String(tokenDoc.id), 'No token found')
            cleanedUpTokens++
            continue
          }
          
          // Basic FCM token format validation
          if (token.startsWith('fcm_') || token.length > 140) {
            // This looks like a valid FCM token format
            validTokens++
            continue
          }
          
          // For iOS, also check APNs token format
          if (platform === 'ios' && tokenDoc.apnsToken && tokenDoc.apnsToken.length === 64) {
            // Valid APNs token format
            validTokens++
            continue
          }
          
          // If we get here, the token format is suspicious
          console.log(`⚠️ [Token Validation] Suspicious token format for device ${tokenDoc.id}: ${token.substring(0, 20)}...`)
          
          // Try to send a test notification to validate the token
          try {
            const { sendFCMMessage } = await import('@/lib/firebase-admin')
            const testResult = await sendFCMMessage(
              token,
              {
                title: 'Test',
                body: 'Token validation test'
              },
              { test: 'validation' }
            )
            
            if (testResult.success) {
              validTokens++
              console.log(`✅ [Token Validation] Token ${tokenDoc.id} validated successfully`)
            } else {
              throw new Error(testResult.error)
            }
          } catch (validationError) {
            const errorMessage = validationError instanceof Error ? validationError.message : String(validationError)
            
            if (errorMessage.includes('invalid-argument') ||
                errorMessage.includes('not a valid FCM registration token') ||
                errorMessage.includes('registration token is not valid')) {
              
              console.log(`🚨 [Token Validation] Invalid token confirmed for device ${tokenDoc.id}, deactivating`)
              await this.deactivateToken(String(tokenDoc.id), 'Invalid FCM token - validation failed')
              cleanedUpTokens++
              invalidTokens++
            } else {
              // Other error, might be temporary, keep the token
              validTokens++
              console.log(`⚠️ [Token Validation] Token ${tokenDoc.id} validation failed with non-token error: ${errorMessage}`)
            }
          }
          
        } catch (error) {
          console.error(`❌ [Token Validation] Error validating token ${tokenDoc.id}:`, error)
          // Don't deactivate on validation errors, might be temporary
        }
      }
      
      console.log(`🧹 [Token Validation] Validation complete: ${validTokens} valid, ${invalidTokens} invalid, ${cleanedUpTokens} cleaned up`)
      
      return {
        success: true,
        validTokens,
        invalidTokens,
        cleanedUpTokens,
        totalTokens: deviceTokens.docs.length
      }
      
    } catch (error) {
      console.error('❌ [Token Validation] Token validation failed:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
  
  /**
   * Deactivate a device token
   */
  private static async deactivateToken(tokenId: string, reason: string) {
    try {
      const payload = await getPayload({ config })
      
      await payload.update({
        collection: 'deviceTokens',
        id: tokenId,
        data: {
          isActive: false,
          lastError: reason,
          deactivatedAt: new Date().toISOString()
        }
      })
      
      console.log(`✅ [Token Cleanup] Deactivated device token ${tokenId}: ${reason}`)
      return true
    } catch (error) {
      console.error(`❌ [Token Cleanup] Failed to deactivate token ${tokenId}:`, error)
      return false
    }
  }
}

export const notificationService = NotificationService

