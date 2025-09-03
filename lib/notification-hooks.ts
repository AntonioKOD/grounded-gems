import { notificationService } from './notification-service'

/**
 * Notification hooks for automatic push notifications
 * These hooks should be called whenever the corresponding action occurs
 */

export class NotificationHooks {
  /**
   * Hook for when a user likes something
   */
  static async onUserLike(
    recipientId: string,
    likerId: string,
    likerName: string,
    postId: string,
    postType: 'post' | 'location' | 'comment'
  ) {
    try {
      await notificationService.notifyNewLike(recipientId, likerId, likerName, postId, postType)
      console.log(`✅ [NotificationHooks] Like notification sent for ${postType} ${postId}`)
    } catch (error) {
      console.error(`❌ [NotificationHooks] Failed to send like notification:`, error)
    }
  }

  /**
   * Hook for when a user comments on something
   */
  static async onUserComment(
    recipientId: string,
    commenterId: string,
    commenterName: string,
    postId: string,
    postType: 'post' | 'location',
    commentText: string
  ) {
    try {
      await notificationService.notifyNewComment(recipientId, commenterId, commenterName, postId, postType, commentText)
      console.log(`✅ [NotificationHooks] Comment notification sent for ${postType} ${postId}`)
    } catch (error) {
      console.error(`❌ [NotificationHooks] Failed to send comment notification:`, error)
    }
  }

  /**
   * Hook for when a user mentions someone
   */
  static async onUserMention(
    recipientId: string,
    mentionerId: string,
    mentionerName: string,
    postId: string,
    postType: 'post' | 'location'
  ) {
    try {
      await notificationService.notifyMention(recipientId, mentionerId, mentionerName, postId, postType)
      console.log(`✅ [NotificationHooks] Mention notification sent for ${postType} ${postId}`)
    } catch (error) {
      console.error(`❌ [NotificationHooks] Failed to send mention notification:`, error)
    }
  }

  /**
   * Hook for when a user interacts with a location
   */
  static async onLocationInteraction(
    recipientId: string,
    interactorId: string,
    interactorName: string,
    locationId: string,
    locationName: string,
    interactionType: 'like' | 'save' | 'share' | 'check_in' | 'review' | 'subscribe'
  ) {
    try {
      await notificationService.notifyLocationInteraction(recipientId, interactorId, interactorName, locationId, locationName, interactionType)
      console.log(`✅ [NotificationHooks] Location interaction notification sent for ${interactionType} on ${locationName}`)
    } catch (error) {
      console.error(`❌ [NotificationHooks] Failed to send location interaction notification:`, error)
    }
  }

  /**
   * Hook for when an event request is received
   */
  static async onEventRequestReceived(
    recipientId: string,
    requesterId: string,
    requesterName: string,
    locationId: string,
    locationName: string,
    eventTitle: string
  ) {
    try {
      await notificationService.notifyEventRequest(recipientId, requesterId, requesterName, locationId, locationName, eventTitle)
      console.log(`✅ [NotificationHooks] Event request notification sent for ${eventTitle} at ${locationName}`)
    } catch (error) {
      console.error(`❌ [NotificationHooks] Failed to send event request notification:`, error)
    }
  }

  /**
   * Hook for when a milestone is reached
   */
  static async onMilestoneReached(
    recipientId: string,
    milestoneType: string,
    milestoneValue: string,
    locationId?: string,
    locationName?: string
  ) {
    try {
      await notificationService.notifyMilestone(recipientId, milestoneType, milestoneValue, locationId, locationName)
      console.log(`✅ [NotificationHooks] Milestone notification sent for ${milestoneType}: ${milestoneValue}`)
    } catch (error) {
      console.error(`❌ [NotificationHooks] Failed to send milestone notification:`, error)
    }
  }

  /**
   * Hook for when a journey invite is sent
   */
  static async onJourneyInvite(
    recipientId: string,
    inviterId: string,
    inviterName: string,
    journeyId: string,
    journeyTitle: string
  ) {
    try {
      await notificationService.notifyJourneyInvite(recipientId, inviterId, inviterName, journeyId, journeyTitle)
      console.log(`✅ [NotificationHooks] Journey invite notification sent for ${journeyTitle}`)
    } catch (error) {
      console.error(`❌ [NotificationHooks] Failed to send journey invite notification:`, error)
    }
  }

  /**
   * Hook for when a reminder is set
   */
  static async onReminderSet(
    recipientId: string,
    reminderType: string,
    reminderText: string,
    relatedId?: string,
    relatedType?: string
  ) {
    try {
      await notificationService.notifyReminder(recipientId, reminderType, reminderText, relatedId, relatedType)
      console.log(`✅ [NotificationHooks] Reminder notification sent for ${reminderType}`)
    } catch (error) {
      console.error(`❌ [NotificationHooks] Failed to send reminder notification:`, error)
    }
  }

  /**
   * Hook for when a user follows someone
   */
  static async onUserFollow(
    recipientId: string,
    followerId: string,
    followerName: string,
    followerAvatar?: string
  ) {
    try {
      await notificationService.notifyNewFollower(recipientId, followerId, followerName, followerAvatar)
      console.log(`✅ [NotificationHooks] Follow notification sent for ${followerName}`)
    } catch (error) {
      console.error(`❌ [NotificationHooks] Failed to send follow notification:`, error)
    }
  }

  /**
   * Hook for when a location is published
   */
  static async onLocationPublished(
    recipientId: string,
    locationId: string,
    locationName: string,
    publisherId: string,
    publisherName: string
  ) {
    try {
      await notificationService.createNotification({
        recipient: recipientId,
        type: 'location_published',
        title: 'New Location Published! 🗺️',
        message: `${publisherName} just published "${locationName}"`,
        metadata: {
          publisherId,
          publisherName,
          locationId,
          locationName,
          action: 'view_location'
        },
        relatedTo: {
          relationTo: 'locations',
          value: locationId
        },
        actionBy: publisherId,
        priority: 'normal'
      })
      console.log(`✅ [NotificationHooks] Location published notification sent for ${locationName}`)
    } catch (error) {
      console.error(`❌ [NotificationHooks] Failed to send location published notification:`, error)
    }
  }

  /**
   * Hook for when a location is verified
   */
  static async onLocationVerified(
    recipientId: string,
    locationId: string,
    locationName: string,
    verifierId: string,
    verifierName: string
  ) {
    try {
      await notificationService.createNotification({
        recipient: recipientId,
        type: 'location_verified',
        title: 'Location Verified! ✅',
        message: `Congratulations! "${locationName}" has been verified by our team`,
        metadata: {
          verifierId,
          verifierName,
          locationId,
          locationName,
          action: 'view_location'
        },
        relatedTo: {
          relationTo: 'locations',
          value: locationId
        },
        actionBy: verifierId,
        priority: 'high'
      })
      console.log(`✅ [NotificationHooks] Location verified notification sent for ${locationName}`)
    } catch (error) {
      console.error(`❌ [NotificationHooks] Failed to send location verified notification:`, error)
    }
  }

  /**
   * Hook for when a location is featured
   */
  static async onLocationFeatured(
    recipientId: string,
    locationId: string,
    locationName: string,
    featureReason?: string
  ) {
    try {
      await notificationService.createNotification({
        recipient: recipientId,
        type: 'location_featured',
        title: 'Location Featured! 🌟',
        message: `Amazing! "${locationName}" is now featured${featureReason ? `: ${featureReason}` : ''}`,
        metadata: {
          locationId,
          locationName,
          featureReason,
          action: 'view_location'
        },
        relatedTo: {
          relationTo: 'locations',
          value: locationId
        },
        priority: 'high'
      })
      console.log(`✅ [NotificationHooks] Location featured notification sent for ${locationName}`)
    } catch (error) {
      console.error(`❌ [NotificationHooks] Failed to send location featured notification:`, error)
    }
  }

  /**
   * Hook for when a new review is received
   */
  static async onNewReview(
    recipientId: string,
    reviewerId: string,
    reviewerName: string,
    locationId: string,
    locationName: string,
    reviewRating: number,
    reviewText?: string
  ) {
    try {
      await notificationService.createNotification({
        recipient: recipientId,
        type: 'new_review',
        title: 'New Review! ⭐',
        message: `${reviewerName} gave ${locationName} ${reviewRating} stars${reviewText ? `: "${reviewText.substring(0, 50)}${reviewText.length > 50 ? '...' : ''}"` : ''}`,
        metadata: {
          reviewerId,
          reviewerName,
          locationId,
          locationName,
          reviewRating,
          reviewText,
          action: 'view_review'
        },
        relatedTo: {
          relationTo: 'locations',
          value: locationId
        },
        actionBy: reviewerId,
        priority: 'normal'
      })
      console.log(`✅ [NotificationHooks] New review notification sent for ${locationName}`)
    } catch (error) {
      console.error(`❌ [NotificationHooks] Failed to send new review notification:`, error)
    }
  }

  /**
   * Hook for when business hours are updated
   */
  static async onBusinessHoursUpdate(
    recipientId: string,
    locationId: string,
    locationName: string,
    updaterId: string,
    updaterName: string,
    updateDetails: string
  ) {
    try {
      await notificationService.createNotification({
        recipient: recipientId,
        type: 'business_hours_update',
        title: 'Business Hours Updated! 🕒',
        message: `${updaterName} updated the business hours for "${locationName}": ${updateDetails}`,
        metadata: {
          updaterId,
          updaterName,
          locationId,
          locationName,
          updateDetails,
          action: 'view_location'
        },
        relatedTo: {
          relationTo: 'locations',
          value: locationId
        },
        actionBy: updaterId,
        priority: 'normal'
      })
      console.log(`✅ [NotificationHooks] Business hours update notification sent for ${locationName}`)
    } catch (error) {
      console.error(`❌ [NotificationHooks] Failed to send business hours update notification:`, error)
    }
  }

  /**
   * Hook for when a special offer is available
   */
  static async onSpecialOffer(
    recipientId: string,
    locationId: string,
    locationName: string,
    offerTitle: string,
    offerDescription: string,
    offerExpiry?: string
  ) {
    try {
      await notificationService.createNotification({
        recipient: recipientId,
        type: 'special_offer',
        title: 'Special Offer! 💰',
        message: `${offerTitle} at "${locationName}": ${offerDescription}${offerExpiry ? ` (Expires: ${offerExpiry})` : ''}`,
        metadata: {
          locationId,
          locationName,
          offerTitle,
          offerDescription,
          offerExpiry,
          action: 'view_offer'
        },
        relatedTo: {
          relationTo: 'locations',
          value: locationId
        },
        priority: 'high'
      })
      console.log(`✅ [NotificationHooks] Special offer notification sent for ${locationName}`)
    } catch (error) {
      console.error(`❌ [NotificationHooks] Failed to send special offer notification:`, error)
    }
  }

  /**
   * Hook for when a proximity alert is triggered
   */
  static async onProximityAlert(
    recipientId: string,
    locationId: string,
    locationName: string,
    distance: string
  ) {
    try {
      await notificationService.createNotification({
        recipient: recipientId,
        type: 'proximity_alert',
        title: 'Nearby Location! 📍',
        message: `"${locationName}" is just ${distance} away from you`,
        metadata: {
          locationId,
          locationName,
          distance,
          action: 'view_location'
        },
        relatedTo: {
          relationTo: 'locations',
          value: locationId
        },
        priority: 'normal'
      })
      console.log(`✅ [NotificationHooks] Proximity alert notification sent for ${locationName}`)
    } catch (error) {
      console.error(`❌ [NotificationHooks] Failed to send proximity alert notification:`, error)
    }
  }
}

export const notificationHooks = NotificationHooks
