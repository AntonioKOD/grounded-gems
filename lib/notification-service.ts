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
          ...data.metadata
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
          const result = await sendFCMMessage(
            tokenDoc.deviceToken,
            {
              title: notification.title,
              body: notification.body,
              imageUrl: notification.imageUrl
            },
            notification.data,
            notification.apns
          )
          
          if (result.success) {
            successCount++
            console.log(`✅ [NotificationService] Push notification sent to device ${tokenDoc.deviceToken.substring(0, 20)}...`)
          } else {
            failedCount++
            console.log(`❌ [NotificationService] Failed to send push notification to device ${tokenDoc.deviceToken.substring(0, 20)}...: ${result.error}`)
          }
        } catch (error) {
          failedCount++
          console.error(`❌ [NotificationService] Error sending push notification to device ${tokenDoc.deviceToken.substring(0, 20)}...:`, error)
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
        followerAvatar,
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
    
    return this.createNotification({
      recipient: recipientId,
      type: `location_${interactionType}`,
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
        locationId,
        locationName,
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
        relatedId,
        relatedType,
        action: 'view_reminder'
      },
      relatedTo: relatedId && relatedType ? {
        relationTo: relatedType,
        value: relatedId
      } : undefined,
      priority: 'normal'
    })
  }
}

export const notificationService = NotificationService

