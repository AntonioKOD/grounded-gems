'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  showNotificationWithPreferences,
  formatNotificationMessage,
  isNotificationSupported,
  getNotificationPermission
} from '@/lib/notifications'
import { getRecentNotifications } from '@/app/actions'

export interface NotificationData {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  priority?: 'low' | 'normal' | 'high'
  actionRequired?: boolean
  metadata?: Record<string, any>
}

interface UseNotificationsReturn {
  notifications: NotificationData[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  refreshNotifications: () => Promise<void>
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  hasPermission: boolean
  isSupported: boolean
}

export function useNotifications(userId?: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  // Check browser notification support and permission
  useEffect(() => {
    setIsSupported(isNotificationSupported())
    if (isNotificationSupported()) {
      setHasPermission(getNotificationPermission() === 'granted')
    }
  }, [])

  // Fetch notifications from server
  const refreshNotifications = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    setError(null)

    try {
      const serverNotifications = await getRecentNotifications(userId, 10)
      
      // Transform server notifications to our format
      const transformedNotifications = serverNotifications.map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: notification.read,
        createdAt: notification.createdAt,
        priority: notification.priority || 'normal',
        actionRequired: notification.actionRequired || false,
        metadata: notification.metadata || {},
      }))

      setNotifications(transformedNotifications)
      setUnreadCount(transformedNotifications.filter(n => !n.read).length)

      // Show browser notifications for new unread notifications
      if (hasPermission && isSupported) {
        const newNotifications = transformedNotifications.filter(n => 
          !n.read && 
          !sessionStorage.getItem(`notification_shown_${n.id}`)
        )

        for (const notification of newNotifications) {
          try {
            // Map notification types to browser notification types
            const browserNotificationType = mapToBrowserNotificationType(notification.type)
            
            if (browserNotificationType) {
              await showNotificationWithPreferences(
                browserNotificationType,
                notification.message,
                {
                  notificationId: notification.id,
                  type: 'notification',
                  ...notification.metadata
                }
              )
              
              // Mark as shown in session storage to avoid duplicates
              sessionStorage.setItem(`notification_shown_${notification.id}`, 'true')
            }
          } catch (browserNotificationError) {
            console.error('Error showing browser notification:', browserNotificationError)
          }
        }
      }

    } catch (fetchError) {
      console.error('Error fetching notifications:', fetchError)
      setError('Failed to fetch notifications')
    } finally {
      setIsLoading(false)
    }
  }, [userId, hasPermission, isSupported])

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    )
    setUnreadCount(0)
  }, [])

  // Auto-refresh notifications
  useEffect(() => {
    if (!userId) return

    // Initial fetch
    refreshNotifications()

    // Set up polling interval
    const intervalId = setInterval(refreshNotifications, 30000) // Every 30 seconds

    return () => clearInterval(intervalId)
  }, [userId, refreshNotifications])

  // Listen for focus events to refresh notifications
  useEffect(() => {
    const handleFocus = () => {
      if (userId) {
        refreshNotifications()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [userId, refreshNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    hasPermission,
    isSupported,
  }
}

// Helper function to map server notification types to browser notification types
function mapToBrowserNotificationType(serverType: string): keyof typeof import('@/lib/notifications').notificationTypes | null {
  const typeMapping = {
    'location_liked': 'LOCATION_LIKED',
    'location_reviewed': 'LOCATION_REVIEWED',
    'event_request_received': 'EVENT_REQUEST',
    'location_verified': 'LOCATION_VERIFIED',
    'location_featured': 'LOCATION_VERIFIED',
    'location_milestone': 'MILESTONE_REACHED',
    'friend_checkin': 'FRIEND_CHECKIN',
    'location_trending': 'TRENDING_LOCATION',
    'proximity_alert': 'PROXIMITY_ALERT',
    'special_offer': 'SPECIAL_OFFER',
    'business_hours_update': 'SPECIAL_OFFER', // Map to special offer for now
  } as const

  return typeMapping[serverType as keyof typeof typeMapping] || null
}

// Hook for managing notification preferences
export function useNotificationPreferences() {
  const [isSupported, setIsSupported] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    setIsSupported(isNotificationSupported())
    if (isNotificationSupported()) {
      setHasPermission(getNotificationPermission() === 'granted')
    }
  }, [])

  const requestPermission = useCallback(async () => {
    try {
      // Only import if running in browser environment
      if (typeof window === 'undefined') return 'denied'
      const { requestNotificationPermission } = await import('@/lib/notifications')
      const permission = await requestNotificationPermission()
      setHasPermission(permission === 'granted')
      return permission
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return 'denied'
    }
  }, [])

  const testNotification = useCallback(async () => {
    try {
      // Only import if running in browser environment
      if (typeof window === 'undefined') throw new Error('Not in browser environment')
      const { showTestNotification } = await import('@/lib/notifications')
      await showTestNotification()
    } catch (error) {
      console.error('Error showing test notification:', error)
      throw error
    }
  }, [])

  return {
    isSupported,
    hasPermission,
    requestPermission,
    testNotification,
  }
} 