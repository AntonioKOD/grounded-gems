/**
 * Browser notification service for Sacavia
 * Implements the Web Notifications API for real-time user notifications
 */

// Check if browser supports notifications
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator
}

// Get current notification permission status
export const getNotificationPermission = (): NotificationPermission => {
  return Notification.permission
}

// Request notification permission from user
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    throw new Error('Notifications not supported in this browser')
  }

  try {
    const permission = await Notification.requestPermission()
    console.log('Notification permission:', permission)
    return permission
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    throw error
  }
}

// Notification data interface
export interface NotificationData {
  type?: string
  locationId?: string
  eventTitle?: string
  eventId?: string
  requestId?: string
  url?: string
  action?: string
  status?: string
  [key: string]: unknown
}

// Notification options interface
export interface NotificationOptions {
  title: string
  message: string
  icon?: string
  badge?: string
  tag?: string
  data?: NotificationData
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  requireInteraction?: boolean
  silent?: boolean
  vibrate?: number[]
  timestamp?: number
}

// Show a browser notification
export const showNotification = async (options: NotificationOptions): Promise<void> => {
  console.log('Attempting to show notification:', options.title)
  
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported')
    return
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted, current status:', Notification.permission)
    return
  }

  try {
    console.log('Creating notification with options:', {
      title: options.title,
      body: options.message,
      icon: options.icon || '/icon1.png',
      tag: options.tag
    })
    
    const notificationOptions = {
      body: options.message,
      icon: options.icon || '/icon1.png',
      badge: options.badge || '/icon1.png',
      tag: options.tag,
      data: options.data,
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
      ...(options.vibrate && { vibrate: options.vibrate }),
      ...(options.timestamp && { timestamp: options.timestamp }),
    }
    
    const notification = new Notification(options.title, notificationOptions)

    console.log('Notification created successfully:', notification)

    // Handle notification click
    notification.onclick = (event) => {
      console.log('Notification clicked:', event)
      event.preventDefault()
      window.focus()
      
      // Handle different notification types
      const data = options.data
      if (data?.type === 'location') {
        window.location.href = `/map?location=${data.locationId}`
      } else if (data?.type === 'event_request') {
        window.location.href = `/events/requests`
      } else if (data?.type === 'review') {
        window.location.href = `/map?location=${data.locationId}#reviews`
      } else if (data?.url) {
        window.location.href = data.url
      }
      
      notification.close()
    }

    // Auto-close notification after 10 seconds unless requireInteraction is true
    if (!options.requireInteraction) {
      setTimeout(() => {
        notification.close()
      }, 10000)
    }

    console.log('Notification setup complete, should be visible now')

  } catch (error) {
    console.error('Error showing notification:', error)
    throw error
  }
}

// Notification types for different events
export const notificationTypes = {
  LOCATION_LIKED: {
    icon: '❤️',
    title: 'Location Liked',
    requireInteraction: false,
  },
  LOCATION_REVIEWED: {
    icon: '⭐',
    title: 'New Review',
    requireInteraction: false,
  },
  EVENT_REQUEST: {
    icon: '🎉',
    title: 'Event Request',
    requireInteraction: true,
  },
  LOCATION_VERIFIED: {
    icon: '✅',
    title: 'Location Verified',
    requireInteraction: false,
  },
  MILESTONE_REACHED: {
    icon: '🎯',
    title: 'Milestone Reached',
    requireInteraction: false,
  },
  FRIEND_CHECKIN: {
    icon: '👋',
    title: 'Friend Activity',
    requireInteraction: false,
  },
  TRENDING_LOCATION: {
    icon: '🔥',
    title: 'Trending Location',
    requireInteraction: false,
  },
  PROXIMITY_ALERT: {
    icon: '📍',
    title: 'Nearby Location',
    requireInteraction: false,
  },
  SPECIAL_OFFER: {
    icon: '💰',
    title: 'Special Offer',
    requireInteraction: false,
  },
} as const

// Show notification based on type
export const showNotificationByType = async (
  type: keyof typeof notificationTypes,
  message: string,
  data?: NotificationData
): Promise<void> => {
  const config = notificationTypes[type]
  console.log(`Showing ${type} notification:`, message)
  
  await showNotification({
    title: `${config.icon} ${config.title}`,
    message,
    tag: type.toLowerCase(),
    data: { type, ...data },
    requireInteraction: config.requireInteraction,
    vibrate: [200, 100, 200],
  })
}

// Request permission and show welcome notification
export const initializeNotifications = async (): Promise<boolean> => {
  try {
    if (!isNotificationSupported()) {
      console.warn('Notifications not supported in this browser')
      return false
    }

    const permission = await requestNotificationPermission()
    
    if (permission === 'granted') {
      // Show welcome notification
      await showNotification({
        title: '🎉 Welcome to Sacavia!',
        message: 'You\'ll now receive notifications about location activities.',
        tag: 'welcome',
        requireInteraction: false,
      })
      
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error initializing notifications:', error)
    return false
  }
}

// Save user notification preferences to localStorage
export const saveNotificationPreferences = (preferences: {
  enabled: boolean
  locationActivities: boolean
  eventRequests: boolean
  milestones: boolean
  friendActivities: boolean
  proximityAlerts: boolean
  specialOffers: boolean
}): void => {
  try {
    localStorage.setItem('notificationPreferences', JSON.stringify(preferences))
    console.log('Notification preferences saved:', preferences)
  } catch (error) {
    console.error('Error saving notification preferences:', error)
  }
}

// Get user notification preferences from localStorage
export const getNotificationPreferences = (): {
  enabled: boolean
  locationActivities: boolean
  eventRequests: boolean
  milestones: boolean
  friendActivities: boolean
  proximityAlerts: boolean
  specialOffers: boolean
} => {
  try {
    const stored = localStorage.getItem('notificationPreferences')
    if (stored) {
      const parsed = JSON.parse(stored)
      console.log('Loaded notification preferences:', parsed)
      return parsed
    }
  } catch (error) {
    console.error('Error loading notification preferences:', error)
  }
  
  // Default preferences
  const defaults = {
    enabled: true,
    locationActivities: true,
    eventRequests: true,
    milestones: true,
    friendActivities: true,
    proximityAlerts: true,
    specialOffers: true
  }
  console.log('Using default notification preferences:', defaults)
  return defaults
}

// Check if a specific notification type should be shown
export const shouldShowNotification = (type: keyof typeof notificationTypes): boolean => {
  const preferences = getNotificationPreferences()
  
  if (!preferences.enabled) {
    console.log('Notifications disabled in preferences')
    return false
  }
  
  const typeMapping: Record<string, keyof typeof preferences> = {
    LOCATION_LIKED: 'locationActivities',
    LOCATION_REVIEWED: 'locationActivities',
    EVENT_REQUEST: 'eventRequests',
    LOCATION_VERIFIED: 'locationActivities',
    MILESTONE_REACHED: 'milestones',
    FRIEND_CHECKIN: 'friendActivities',
    TRENDING_LOCATION: 'locationActivities',
    PROXIMITY_ALERT: 'proximityAlerts',
    SPECIAL_OFFER: 'specialOffers',
  }
  
  const prefKey = typeMapping[type]
  const shouldShow = prefKey ? preferences[prefKey] : true
  console.log(`Should show ${type} notification:`, shouldShow, 'based on preference:', prefKey)
  return shouldShow
}

// Show notification with user preference check
export const showNotificationWithPreferences = async (
  type: keyof typeof notificationTypes,
  message: string,
  data?: NotificationData
): Promise<void> => {
  if (!shouldShowNotification(type)) {
    console.log(`Skipping ${type} notification due to user preferences`)
    return
  }
  
  console.log(`Showing ${type} notification with preferences check passed`)
  await showNotificationByType(type, message, data)
}

// Show a test notification
export const showTestNotification = async (): Promise<void> => {
  console.log('Showing test notification')
  await showNotification({
    title: '🧪 Test Notification',
    message: 'This is a test notification from Sacavia!',
    tag: 'test',
    requireInteraction: false,
  })
}

// Clear all notifications with a specific tag
export const clearNotifications = (tag?: string): void => {
  // Note: This only works in some browsers and with service worker notifications
  console.log('Clearing notifications with tag:', tag)
}

// Format notification message based on type and data
export const formatNotificationMessage = (
  type: string,
  data: {
    userName?: string
    locationName?: string
    count?: number
    action?: string
  }
): string => {
  console.log('Formatting notification message for type:', type, 'with data:', data)
  
  switch (type) {
    case 'location_liked':
      return `❤️ You liked "${data.locationName}"! Great choice.`
    case 'location_saved':
      return `💾 "${data.locationName}" has been saved to your favorites.`
    case 'location_shared':
      return `📤 You shared "${data.locationName}" with your friends.`
    case 'location_milestone':
      return `🎯 Amazing! "${data.locationName}" has reached ${data.count} ${data.action}!`
    case 'friend_checkin':
      return `👋 ${data.userName} checked in at "${data.locationName}". Say hello!`
    case 'location_trending':
      return `🔥 "${data.locationName}" is trending in your area!`
    case 'proximity_alert':
      return `📍 You're near "${data.locationName}"! Perfect time to check it out.`
    case 'special_offer':
      return `💰 Special offer at "${data.locationName}"! Check it out.`
    case 'location_verified':
      return `✅ Great news! "${data.locationName}" has been verified.`
    default:
      return `🔔 Update from "${data.locationName}"`
  }
} 