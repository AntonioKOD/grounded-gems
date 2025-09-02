import { sendFCMMessage, sendFCMMessageToMultipleTokens } from './firebase-admin'

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

export class NotificationService {
  /**
   * Create a notification in the database
   */
  static async createNotification(data: {
    recipient: string
    type: string
    title: string
    message?: string
    metadata?: Record<string, any>
    read?: boolean
  }) {
    try {
      // For now, return a placeholder response
      // This would typically create a notification in the database
      console.log(`Creating notification: ${data.type} for ${data.recipient}`)
      
      return {
        success: true,
        id: `notification_${Date.now()}`,
        message: 'Notification created successfully'
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
   * Send notification to a single user
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
   * Send notification to multiple users
   */
  static async sendToUsers(notification: BulkNotification) {
    try {
      // Send notification to multiple users using the push API
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'user',
          target: notification.userIds.join(','), // For multiple users, we'll need to handle this differently
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
      console.error('Error sending notification to users:', error)
      throw error
    }
  }

  /**
   * Send notification to all users
   */
  static async sendToAll(notification: NotificationPayload) {
    try {
      const response = await fetch('/api/fcm/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...notification,
          sendToAll: true,
        }),
      })

      return await response.json()
    } catch (error) {
      console.error('Error sending notification to all users:', error)
      throw error
    }
  }

  /**
   * Send welcome notification to new users
   */
  static async sendWelcomeNotification(userId: string, userName: string) {
    return this.sendToUser({
      userId,
      title: 'Welcome to Sacavia! 🎉',
      body: `Hi ${userName}, we're excited to have you on board. Start exploring amazing places and experiences!`,
      data: {
        type: 'welcome',
        userId,
        action: 'explore',
      },
      apns: {
        payload: {
          category: 'welcome',
          'thread-id': 'welcome',
        },
      },
    })
  }

  /**
   * Send new follower notification
   */
  static async sendNewFollowerNotification(
    userId: string,
    followerName: string,
    followerId: string
  ) {
    return this.sendToUser({
      userId,
      title: 'New Follower! 👥',
      body: `${followerName} started following you`,
      data: {
        type: 'new_follower',
        followerId,
        userId,
        action: 'view_profile',
      },
      apns: {
        payload: {
          category: 'social',
          'thread-id': 'followers',
        },
      },
    })
  }

  /**
   * Send new post notification
   */
  static async sendNewPostNotification(
    userId: string,
    authorName: string,
    postId: string,
    postTitle?: string
  ) {
    return this.sendToUser({
      userId,
      title: 'New Post from Followed User 📝',
      body: `${authorName} shared ${postTitle ? `"${postTitle}"` : 'a new post'}`,
      data: {
        type: 'new_post',
        postId,
        authorId: userId,
        action: 'view_post',
      },
      apns: {
        payload: {
          category: 'content',
          'thread-id': 'posts',
        },
      },
    })
  }

  /**
   * Send event reminder notification
   */
  static async sendEventReminderNotification(
    userId: string,
    eventName: string,
    eventId: string,
    eventTime: string
  ) {
    return this.sendToUser({
      userId,
      title: 'Event Reminder! 📅',
      body: `Don't forget: ${eventName} is starting soon`,
      data: {
        type: 'event_reminder',
        eventId,
        eventTime,
        action: 'view_event',
      },
      apns: {
        payload: {
          category: 'event',
          'thread-id': 'events',
        },
      },
    })
  }

  /**
   * Send location recommendation notification
   */
  static async sendLocationRecommendationNotification(
    userId: string,
    locationName: string,
    locationId: string,
    reason: string
  ) {
    return this.sendToUser({
      userId,
      title: 'New Place for You! 🗺️',
      body: `We think you'll love ${locationName}. ${reason}`,
      data: {
        type: 'location_recommendation',
        locationId,
        reason,
        action: 'view_location',
      },
      apns: {
        payload: {
          category: 'recommendation',
          'thread-id': 'recommendations',
        },
      },
    })
  }

  /**
   * Send achievement notification
   */
  static async sendAchievementNotification(
    userId: string,
    achievementName: string,
    achievementDescription: string
  ) {
    return this.sendToUser({
      userId,
      title: 'Achievement Unlocked! 🏆',
      body: `${achievementName}: ${achievementDescription}`,
      data: {
        type: 'achievement',
        achievementName,
        action: 'view_achievements',
      },
      apns: {
        payload: {
          category: 'achievement',
          'thread-id': 'achievements',
        },
      },
    })
  }

  /**
   * Send weekly digest notification
   */
  static async sendWeeklyDigestNotification(
    userId: string,
    highlights: string[]
  ) {
    const highlightText = highlights.slice(0, 2).join(', ')
    const remainingCount = Math.max(0, highlights.length - 2)
    
    let body = `This week: ${highlightText}`
    if (remainingCount > 0) {
      body += ` and ${remainingCount} more highlights`
    }

    return this.sendToUser({
      userId,
      title: 'Your Weekly Recap 📊',
      body,
      data: {
        type: 'weekly_digest',
        highlightsCount: highlights.length.toString(),
        action: 'view_digest',
      },
      apns: {
        payload: {
          category: 'digest',
          'thread-id': 'weekly_digest',
        },
      },
    })
  }

  /**
   * Send system maintenance notification
   */
  static async sendSystemMaintenanceNotification(
    userIds: string[],
    maintenanceMessage: string,
    estimatedDuration?: string
  ) {
    const title = 'System Maintenance 🔧'
    let body = maintenanceMessage
    if (estimatedDuration) {
      body += ` Estimated duration: ${estimatedDuration}`
    }

    return this.sendToUsers({
      userIds,
      title,
      body,
      data: {
        type: 'system_maintenance',
        estimatedDuration: estimatedDuration || '',
        action: 'view_status',
      },
      apns: {
        payload: {
          category: 'system',
          'thread-id': 'system',
        },
      },
    })
  }
}

// Export a default instance for backward compatibility
export const notificationService = NotificationService

