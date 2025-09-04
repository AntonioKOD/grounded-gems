/**
 * Real-Time Events Protocol
 * 
 * This file centralizes all WebSocket event names and message interfaces
 * to ensure the client and server share the same communication protocol.
 * 
 * All events follow a consistent structure:
 * - Event names are UPPER_SNAKE_CASE
 * - Message interfaces extend BaseRealTimeMessage
 * - Each event has specific data requirements
 * - Timestamps and message IDs are automatically handled
 */

// ============================================================================
// BASE TYPES AND INTERFACES
// ============================================================================

/**
 * Base interface for all real-time messages
 */
export interface BaseRealTimeMessage {
  /** Unique identifier for this message */
  messageId: string
  /** When the message was created (ISO string) */
  timestamp: string
  /** Type of event this message represents */
  eventType: RealTimeEventType
  /** User ID who triggered this event (if applicable) */
  actorId?: string
  /** Target user ID (if applicable) */
  targetUserId?: string
  /** Additional metadata */
  metadata?: Record<string, any>
}

/**
 * All possible real-time event types
 */
export enum RealTimeEventType {
  // Connection & System Events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  HEARTBEAT = 'heartbeat',
  ERROR = 'error',
  
  // Feed & Content Events
  FEED_UPDATE = 'feed_update',
  NEW_POST = 'new_post',
  POST_UPDATED = 'post_updated',
  POST_DELETED = 'post_deleted',
  POST_LIKED = 'post_liked',
  POST_UNLIKED = 'post_unliked',
  POST_SAVED = 'post_saved',
  POST_UNSAVED = 'post_unsaved',
  POST_SHARED = 'post_shared',
  
  // Comment Events
  NEW_COMMENT = 'new_comment',
  COMMENT_UPDATED = 'comment_updated',
  COMMENT_DELETED = 'comment_deleted',
  COMMENT_LIKED = 'comment_liked',
  COMMENT_UNLIKED = 'comment_unliked',
  NEW_REPLY = 'new_reply',
  
  // User & Social Events
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_FOLLOWED = 'user_followed',
  USER_UNFOLLOWED = 'user_unfollowed',
  USER_BLOCKED = 'user_blocked',
  USER_UNBLOCKED = 'user_unblocked',
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
  USER_PROFILE_UPDATED = 'user_profile_updated',
  USER_STATUS_CHANGED = 'user_status_changed',
  USER_PREFERENCES_CHANGED = 'user_preferences_changed',
  
  // Location Events
  LOCATION_CREATED = 'location_created',
  LOCATION_UPDATED = 'location_updated',
  LOCATION_DELETED = 'location_deleted',
  LOCATION_STATUS_CHANGED = 'location_status_changed',
  LOCATION_DETAILS_UPDATED = 'location_details_updated',
  LOCATION_RATING_UPDATED = 'location_rating_updated',
  LOCATION_LIKED = 'location_liked',
  LOCATION_UNLIKED = 'location_unliked',
  LOCATION_SAVED = 'location_saved',
  LOCATION_UNSAVED = 'location_unsaved',
  LOCATION_SHARED = 'location_shared',
  LOCATION_CHECKED_IN = 'location_checked_in',
  LOCATION_VISITED = 'location_visited',
  LOCATION_MILESTONE = 'location_milestone',
  
  // Review Events
  NEW_REVIEW = 'new_review',
  REVIEW_CREATED = 'review_created',
  REVIEW_UPDATED = 'review_updated',
  REVIEW_DELETED = 'review_deleted',
  REVIEW_LIKED = 'review_liked',
  REVIEW_UNLIKED = 'review_unliked',
  REVIEW_HELPFUL = 'review_helpful',
  REVIEW_UNHELPFUL = 'review_unhelpful',
  
  // Event Events
  EVENT_CREATED = 'event_created',
  EVENT_UPDATED = 'event_updated',
  EVENT_DELETED = 'event_deleted',
  EVENT_STATUS_CHANGED = 'event_status_changed',
  EVENT_DETAILS_UPDATED = 'event_details_updated',
  EVENT_RSVP_UPDATED = 'event_rsvp_updated',
  EVENT_RSVP = 'event_rsvp',
  EVENT_RSVP_CANCELLED = 'event_rsvp_cancelled',
  EVENT_INVITE_SENT = 'event_invite_sent',
  EVENT_INVITE_ACCEPTED = 'event_invite_accepted',
  EVENT_INVITE_DECLINED = 'event_invite_declined',
  
  // Guide Events
  GUIDE_CREATED = 'guide_created',
  GUIDE_UPDATED = 'guide_updated',
  GUIDE_DELETED = 'guide_deleted',
  GUIDE_PURCHASED = 'guide_purchased',
  GUIDE_REVIEWED = 'guide_reviewed',
  
  // Notification Events
  NOTIFICATION_CREATED = 'notification_created',
  NOTIFICATION_UPDATED = 'notification_updated',
  NOTIFICATION_READ = 'notification_read',
  NOTIFICATION_DELETED = 'notification_deleted',
  
  // Challenge Events
  CHALLENGE_CREATED = 'challenge_created',
  CHALLENGE_JOINED = 'challenge_joined',
  CHALLENGE_COMPLETED = 'challenge_completed',
  CHALLENGE_MILESTONE = 'challenge_milestone',
  
  // Contest Events
  CONTEST_ENTRY_SUBMITTED = 'contest_entry_submitted',
  CONTEST_ENTRY_UPDATED = 'contest_entry_updated',
  CONTEST_ENTRY_DELETED = 'contest_entry_deleted',
  CONTEST_UPVOTE = 'contest_upvote',
  CONTEST_UPVOTE_REMOVED = 'contest_upvote_removed',
  
  // Business Events
  BUSINESS_APPLICATION_SUBMITTED = 'business_application_submitted',
  BUSINESS_APPLICATION_APPROVED = 'business_application_approved',
  BUSINESS_APPLICATION_REJECTED = 'business_application_rejected',
  SPECIAL_CREATED = 'special_created',
  SPECIAL_UPDATED = 'special_updated',
  SPECIAL_DELETED = 'special_deleted',
  
  // AI & Planning Events
  AI_PLAN_CREATED = 'ai_plan_created',
  AI_PLAN_UPDATED = 'ai_plan_updated',
  AI_PLAN_COMPLETED = 'ai_plan_completed',
  AI_INSIGHT_GENERATED = 'ai_insight_generated',
  
  // Media Events
  MEDIA_CREATED = 'media_created',
  MEDIA_UPDATED = 'media_updated',
  MEDIA_DELETED = 'media_deleted',
  MEDIA_UPLOADED = 'media_uploaded',
  PHOTO_APPROVED = 'photo_approved',
  PHOTO_REJECTED = 'photo_rejected',
  
  // Moderation Events
  CONTENT_REPORTED = 'content_reported',
  CONTENT_MODERATED = 'content_moderated',
  USER_SUSPENDED = 'user_suspended',
  USER_BANNED = 'user_banned',
  
  // Analytics & Insights Events
  ENGAGEMENT_MILESTONE = 'engagement_milestone',
  POPULARITY_SPIKE = 'popularity_spike',
  TRENDING_CONTENT = 'trending_content',
  USER_ACTIVITY = 'user_activity'
}

// ============================================================================
// FEED & CONTENT EVENTS
// ============================================================================

export interface FeedUpdateMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.FEED_UPDATE
  data: {
    /** Feed items that were updated */
    updatedItems: Array<{
      id: string
      type: 'post' | 'location' | 'event' | 'guide'
      lastUpdated: string
      changeType: 'created' | 'updated' | 'deleted'
    }>
    /** Total count of items in feed */
    totalCount: number
    /** Whether this is a full refresh or incremental update */
    isFullRefresh: boolean
  }
}

export interface NewPostMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.NEW_POST
  data: {
    /** The new post data */
    post: {
      id: string
      title: string
      content: string
      author: {
        id: string
        name: string
        avatar?: string
      }
      createdAt: string
      type: 'post' | 'review' | 'recommendation'
      locationId?: string
      locationName?: string
    }
    /** Whether to insert at top or bottom of feed */
    insertPosition: 'top' | 'bottom'
  }
}

export interface PostUpdatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.POST_UPDATED
  data: {
    /** Post ID that was updated */
    postId: string
    /** Updated post data */
    updates: {
      title?: string
      content?: string
      imageUrl?: string
      videoUrl?: string
      lastUpdated: string
    }
    /** Whether this affects the feed order */
    affectsFeedOrder: boolean
  }
}

export interface PostDeletedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.POST_DELETED
  data: {
    /** ID of the deleted post */
    postId: string
    /** Whether to remove from feed immediately */
    removeFromFeed: boolean
  }
}

export interface PostInteractionMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.POST_LIKED | RealTimeEventType.POST_UNLIKED | RealTimeEventType.POST_SAVED | RealTimeEventType.POST_UNSAVED
  data: {
    /** Post ID that was interacted with */
    postId: string
    /** Type of interaction */
    interactionType: 'like' | 'unlike' | 'save' | 'unsave'
    /** New like/save count */
    newCount: number
    /** Whether the current user performed this action */
    isCurrentUser: boolean
  }
}

// ============================================================================
// COMMENT EVENTS
// ============================================================================

export interface NewCommentMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.NEW_COMMENT
  data: {
    /** The new comment data */
    comment: {
      id: string
      content: string
      author: {
        id: string
        name: string
        avatar?: string
      }
      createdAt: string
      postId: string
      parentCommentId?: string
      isReply: boolean
    }
    /** Post information for context */
    post: {
      id: string
      title: string
      authorId: string
    }
    /** Whether to show notification */
    showNotification: boolean
  }
}

export interface CommentUpdatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.COMMENT_UPDATED
  data: {
    /** Comment ID that was updated */
    commentId: string
    /** Updated comment data */
    updates: {
      content: string
      lastUpdated: string
    }
    /** Post ID for context */
    postId: string
  }
}

export interface CommentDeletedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.COMMENT_DELETED
  data: {
    /** ID of the deleted comment */
    commentId: string
    /** Post ID for context */
    postId: string
    /** Whether to remove from UI immediately */
    removeFromUI: boolean
  }
}

// ============================================================================
// USER & SOCIAL EVENTS
// ============================================================================

export interface UserFollowMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.USER_FOLLOWED | RealTimeEventType.USER_UNFOLLOWED
  data: {
    /** User who performed the action */
    follower: {
      id: string
      name: string
      avatar?: string
    }
    /** User who was followed/unfollowed */
    followed: {
      id: string
      name: string
      avatar?: string
    }
    /** Whether this is a follow or unfollow */
    isFollow: boolean
    /** New follower count for the followed user */
    newFollowerCount: number
  }
}

export interface UserStatusMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.USER_ONLINE | RealTimeEventType.USER_OFFLINE
  data: {
    /** User whose status changed */
    user: {
      id: string
      name: string
      avatar?: string
    }
    /** New status */
    status: 'online' | 'offline'
    /** Last seen timestamp */
    lastSeen?: string
  }
}

export interface UserCreatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.USER_CREATED
  data: {
    /** The new user data */
    user: {
      id: string
      name: string
      email: string
      avatar?: string
      isVerified: boolean
      isBusinessOwner: boolean
      createdAt: string
    }
  }
}

export interface UserUpdatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.USER_UPDATED
  data: {
    /** User ID that was updated */
    userId: string
    /** Updated user data */
    updates: {
      name?: string
      bio?: string
      avatar?: string
      location?: string
      website?: string
      lastUpdated: string
    }
  }
}

export interface UserDeletedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.USER_DELETED
  data: {
    /** ID of the deleted user */
    userId: string
    /** Whether to remove from feeds */
    removeFromFeeds: boolean
    /** Whether cleanup is required */
    cleanupRequired: boolean
  }
}

export interface UserProfileUpdatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.USER_PROFILE_UPDATED
  data: {
    /** User whose profile was updated */
    userId: string
    /** Updated profile fields */
    updates: {
      name?: string
      bio?: string
      avatar?: string
      location?: string
      website?: string
      lastUpdated: string
    }
  }
}

export interface UserStatusChangedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.USER_STATUS_CHANGED
  data: {
    /** User whose status changed */
    userId: string
    /** New status information */
    status: {
      isOnline: boolean
      lastSeen: string
      status: string
    }
    /** Previous status information */
    previousStatus: {
      isOnline: boolean
      lastSeen: string
      status: string
    }
  }
}

export interface UserPreferencesChangedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.USER_PREFERENCES_CHANGED
  data: {
    /** User whose preferences changed */
    userId: string
    /** New preferences */
    preferences: any
    /** New notification settings */
    notificationSettings: any
    /** New privacy settings */
    privacySettings: any
    /** Previous preferences */
    previousPreferences: any
    /** Previous notification settings */
    previousNotificationSettings: any
    /** Previous privacy settings */
    previousPrivacySettings: any
  }
}

// ============================================================================
// LOCATION EVENTS
// ============================================================================

export interface LocationCreatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.LOCATION_CREATED
  data: {
    /** The new location data */
    location: {
      id: string
      name: string
      address: string
      city: string
      state: string
      country: string
      coordinates: {
        latitude: number
        longitude: number
      }
      createdBy: {
        id: string
        name: string
        avatar?: string
      }
      createdAt: string
    }
    /** Whether to add to nearby locations */
    addToNearby: boolean
  }
}

export interface LocationUpdatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.LOCATION_UPDATED
  data: {
    /** Location ID that was updated */
    locationId: string
    /** Updated location data */
    updates: {
      name?: string
      address?: string
      city?: string
      state?: string
      country?: string
      coordinates?: {
        latitude: number
        longitude: number
      }
      lastUpdated: string
    }
  }
}

export interface LocationInteractionMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.LOCATION_LIKED | RealTimeEventType.LOCATION_UNLIKED | RealTimeEventType.LOCATION_SAVED | RealTimeEventType.LOCATION_UNSAVED
  data: {
    /** Location ID that was interacted with */
    locationId: string
    /** Location name for context */
    locationName: string
    /** Type of interaction */
    interactionType: 'like' | 'unlike' | 'save' | 'unsave'
    /** New like/save count */
    newCount: number
    /** Whether the current user performed this action */
    isCurrentUser: boolean
  }
}

export interface LocationMilestoneMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.LOCATION_MILESTONE
  data: {
    /** Location ID that reached the milestone */
    locationId: string
    /** Location name */
    locationName: string
    /** Type of milestone */
    milestoneType: 'visit_count' | 'review_count' | 'photo_count' | 'check_in_count'
    /** Milestone value */
    milestoneValue: string
    /** Whether to show celebration animation */
    showCelebration: boolean
  }
}

export interface LocationStatusChangedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.LOCATION_STATUS_CHANGED
  data: {
    /** Location ID that changed status */
    locationId: string
    /** New status information */
    status: {
      status: string
      isVerified: boolean
      isFeatured: boolean
    }
    /** Previous status information */
    previousStatus: {
      status: string
      isVerified: boolean
      isFeatured: boolean
    }
  }
}

export interface LocationDetailsUpdatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.LOCATION_DETAILS_UPDATED
  data: {
    /** Location ID that was updated */
    locationId: string
    /** Updated location details */
    updates: {
      name: string
      description: string
      featuredImage?: string
      galleryCount: number
    }
  }
}

export interface LocationRatingUpdatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.LOCATION_RATING_UPDATED
  data: {
    /** Location ID that had rating changes */
    locationId: string
    /** New rating information */
    ratings: {
      averageRating: number
      reviewCount: number
    }
    /** Previous rating information */
    previousRatings: {
      averageRating: number
      reviewCount: number
    }
  }
}

// ============================================================================
// REVIEW EVENTS
// ============================================================================

export interface ReviewCreatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.REVIEW_CREATED
  data: {
    /** The new review data */
    review: {
      id: string
      title: string
      content: string
      rating: number
      reviewType: string
      author: {
        id: string
        name: string
      }
      createdAt: string
      targetId: string
      targetType: string
    }
  }
}

export interface ReviewUpdatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.REVIEW_UPDATED
  data: {
    /** Review ID that was updated */
    reviewId: string
    /** Updated review data */
    updates: {
      title: string
      content: string
      rating: number
      status: string
    }
    /** Previous review data */
    previousData: {
      title: string
      content: string
      rating: number
      status: string
    }
  }
}

export interface ReviewDeletedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.REVIEW_DELETED
  data: {
    /** ID of the deleted review */
    reviewId: string
    /** Type of review that was deleted */
    reviewType: string
    /** ID of the target (location, event, etc.) */
    targetId: string
    /** Whether to remove from feeds */
    removeFromFeeds: boolean
  }
}

// ============================================================================
// EVENT EVENTS
// ============================================================================

export interface EventCreatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.EVENT_CREATED
  data: {
    /** The new event data */
    event: {
      id: string
      name: string
      description: string
      startDate: string
      endDate?: string
      location: string
      organizer: string
      status: string
      createdAt: string
    }
  }
}

export interface EventUpdatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.EVENT_UPDATED
  data: {
    /** Event ID that was updated */
    eventId: string
    /** Updated event data */
    updates: {
      name?: string
      description?: string
      startDate?: string
      endDate?: string
      location?: string
      lastUpdated: string
    }
  }
}

export interface EventDeletedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.EVENT_DELETED
  data: {
    /** ID of the deleted event */
    eventId: string
    /** Whether to remove from feeds immediately */
    removeFromFeeds: boolean
    /** Whether cleanup is required */
    cleanupRequired: boolean
  }
}

export interface EventStatusChangedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.EVENT_STATUS_CHANGED
  data: {
    /** Event ID that changed status */
    eventId: string
    /** New status information */
    status: {
      status: string
      isCancelled: boolean
      isPostponed: boolean
    }
    /** Previous status information */
    previousStatus: {
      status: string
      isCancelled: boolean
      isPostponed: boolean
    }
  }
}

export interface EventDetailsUpdatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.EVENT_DETAILS_UPDATED
  data: {
    /** Event ID that was updated */
    eventId: string
    /** Updated event details */
    updates: {
      name: string
      description: string
      startDate: string
      endDate: string
      location: string
    }
  }
}

export interface EventRsvpUpdatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.EVENT_RSVP_UPDATED
  data: {
    /** Event ID that had RSVP changes */
    eventId: string
    /** New RSVP counts */
    rsvpCounts: {
      interested: number
      going: number
      invited: number
    }
    /** Previous RSVP counts */
    previousCounts: {
      interested: number
      going: number
      invited: number
    }
  }
}

// ============================================================================
// MEDIA EVENTS
// ============================================================================

export interface MediaCreatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.MEDIA_CREATED
  data: {
    /** The new media data */
    media: {
      id: string
      filename: string
      mimeType: string
      filesize: number
      url: string
      alt?: string
      createdAt: string
    }
  }
}

export interface MediaUpdatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.MEDIA_UPDATED
  data: {
    /** Media ID that was updated */
    mediaId: string
    /** Updated media data */
    updates: {
      filename?: string
      alt?: string
      lastUpdated: string
    }
  }
}

export interface MediaDeletedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.MEDIA_DELETED
  data: {
    /** ID of the deleted media */
    mediaId: string
    /** Whether cleanup is required */
    cleanupRequired: boolean
  }
}

// ============================================================================
// NOTIFICATION EVENTS
// ============================================================================

export interface NotificationCreatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.NOTIFICATION_CREATED
  data: {
    /** The new notification data */
    notification: {
      id: string
      type: string
      title: string
      message: string
      recipientId: string
      actionBy: string
      relatedTo?: {
        relationTo: string
        value: string
      }
      metadata?: Record<string, any>
      createdAt: string
    }
    /** Whether to show in-app notification */
    showInApp: boolean
    /** Whether to update badge count */
    updateBadge: boolean
  }
}

export interface NotificationUpdatedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.NOTIFICATION_UPDATED
  data: {
    /** ID of the updated notification */
    notificationId: string
    /** Updated notification data */
    updates: {
      actionStatus?: string
      read?: boolean
      lastUpdated: string
    }
  }
}

export interface NotificationReadMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.NOTIFICATION_READ
  data: {
    /** ID of the read notification */
    notificationId: string
    /** User ID who read the notification */
    userId: string
    /** Whether to update badge count */
    updateBadge: boolean
  }
}

export interface NotificationDeletedMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.NOTIFICATION_DELETED
  data: {
    /** ID of the deleted notification */
    notificationId: string
    /** User ID who had the notification */
    recipientId: string
    /** Whether to remove from feeds */
    removeFromFeeds: boolean
  }
}

// ============================================================================
// SYSTEM & CONNECTION EVENTS
// ============================================================================

export interface ConnectMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.CONNECT
  data: {
    /** User ID who connected */
    userId: string
    /** Connection timestamp */
    connectedAt: string
    /** User's current status */
    status: 'online' | 'away' | 'busy'
  }
}

export interface DisconnectMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.DISCONNECT
  data: {
    /** User ID who disconnected */
    userId: string
    /** Disconnection timestamp */
    disconnectedAt: string
    /** Reason for disconnection */
    reason: 'user_initiated' | 'network_error' | 'server_error' | 'timeout'
  }
}

export interface HeartbeatMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.HEARTBEAT
  data: {
    /** User ID sending heartbeat */
    userId: string
    /** Current timestamp */
    currentTime: string
    /** User's current status */
    status: 'online' | 'away' | 'busy'
  }
}

export interface ErrorMessage extends BaseRealTimeMessage {
  eventType: RealTimeEventType.ERROR
  data: {
    /** Error code */
    errorCode: string
    /** Error message */
    errorMessage: string
    /** Error details */
    errorDetails?: any
    /** Whether to show to user */
    showToUser: boolean
    /** Whether to log error */
    logError: boolean
  }
}

// ============================================================================
// UNION TYPE FOR ALL MESSAGES
// ============================================================================

export type RealTimeMessage = 
  | FeedUpdateMessage
  | NewPostMessage
  | PostUpdatedMessage
  | PostDeletedMessage
  | PostInteractionMessage
  | NewCommentMessage
  | CommentUpdatedMessage
  | CommentDeletedMessage
  | UserCreatedMessage
  | UserUpdatedMessage
  | UserDeletedMessage
  | UserFollowMessage
  | UserStatusMessage
  | UserProfileUpdatedMessage
  | UserStatusChangedMessage
  | UserPreferencesChangedMessage
  | LocationCreatedMessage
  | LocationUpdatedMessage
  | LocationInteractionMessage
  | LocationMilestoneMessage
  | LocationStatusChangedMessage
  | LocationDetailsUpdatedMessage
  | LocationRatingUpdatedMessage
  | ReviewCreatedMessage
  | ReviewUpdatedMessage
  | ReviewDeletedMessage
  | EventCreatedMessage
  | EventUpdatedMessage
  | EventDeletedMessage
  | EventStatusChangedMessage
  | EventDetailsUpdatedMessage
  | EventRsvpUpdatedMessage
  | MediaCreatedMessage
  | MediaUpdatedMessage
  | MediaDeletedMessage
  | NotificationCreatedMessage
  | NotificationUpdatedMessage
  | NotificationReadMessage
  | NotificationDeletedMessage
  | ConnectMessage
  | DisconnectMessage
  | HeartbeatMessage
  | ErrorMessage

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create a base message with common fields
 */
export function createBaseMessage(eventType: RealTimeEventType, actorId?: string, targetUserId?: string): Omit<BaseRealTimeMessage, 'data'> {
  return {
    messageId: generateMessageId(),
    timestamp: new Date().toISOString(),
    eventType,
    actorId,
    targetUserId
  }
}

/**
 * Validate a real-time message
 */
export function validateMessage(message: any): message is RealTimeMessage {
  return (
    message &&
    typeof message === 'object' &&
    typeof message.messageId === 'string' &&
    typeof message.timestamp === 'string' &&
    typeof message.eventType === 'string' &&
    Object.values(RealTimeEventType).includes(message.eventType as RealTimeEventType) &&
    message.data &&
    typeof message.data === 'object'
  )
}

/**
 * Check if a message is of a specific event type
 */
export function isEventType<T extends RealTimeEventType>(
  message: RealTimeMessage,
  eventType: T
): message is Extract<RealTimeMessage, { eventType: T }> {
  return message.eventType === eventType
}

/**
 * Get the event type from a message
 */
export function getEventType(message: RealTimeMessage): RealTimeEventType {
  return message.eventType
}

/**
 * Check if a message requires immediate UI update
 */
export function requiresImmediateUpdate(message: RealTimeMessage): boolean {
  const immediateEvents = [
    RealTimeEventType.NEW_POST,
    RealTimeEventType.POST_DELETED,
    RealTimeEventType.NEW_COMMENT,
    RealTimeEventType.COMMENT_DELETED,
    RealTimeEventType.NOTIFICATION_CREATED,
    RealTimeEventType.USER_FOLLOWED,
    RealTimeEventType.USER_UNFOLLOWED
  ]
  
  return immediateEvents.includes(message.eventType)
}

/**
 * Check if a message affects the current user
 */
export function affectsCurrentUser(message: RealTimeMessage, currentUserId: string): boolean {
  return (
    message.targetUserId === currentUserId ||
    message.actorId === currentUserId ||
    (message.data as any)?.isCurrentUser === true
  )
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  RealTimeEventType as EventType,
  BaseRealTimeMessage as BaseMessage,
  RealTimeMessage as Message
}
