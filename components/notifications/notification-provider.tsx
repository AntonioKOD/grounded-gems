'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { NotificationToastContainer } from './notification-toast'
import { useCurrentUser } from '@/hooks/use-current-user'

interface NotificationToast {
  id: string
  type: string
  title: string
  message: string
  actionBy?: {
    id: string
    name: string
    profileImage?: { url: string }
  }
  relatedTo?: {
    id: string
    collection: string
  }
  metadata?: Record<string, unknown>
  createdAt: string
}

interface NotificationContextType {
  showNotification: (notification: NotificationToast) => void
  dismissNotification: (id: string) => void
  clearAllNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: React.ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationToast[]>([])
  const [lastNotificationCheck, setLastNotificationCheck] = useState<Date>(new Date())
  const { user } = useCurrentUser()

  // Function to add a new notification toast
  const showNotification = useCallback((notification: NotificationToast) => {
    setNotifications(prev => {
      // Avoid duplicate notifications
      const exists = prev.some(n => n.id === notification.id)
      if (exists) return prev
      
      // Limit to 3 notifications at once
      const newNotifications = [notification, ...prev].slice(0, 3)
      return newNotifications
    })
  }, [])

  // Function to dismiss a specific notification
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Function to clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Poll for new notifications
  useEffect(() => {
    if (!user?.id) return

    const pollNotifications = async () => {
      try {
        const response = await fetch(`/api/notifications?userId=${user.id}&since=${lastNotificationCheck.toISOString()}`, {
          credentials: 'include'
        })
        
        if (!response.ok) return

        const data = await response.json()
        
        if (data.success && data.notifications && data.notifications.length > 0) {
          // Show toast for new notifications
          data.notifications.forEach((notification: any) => {
            // Only show toast for unread notifications that are recent (last 5 minutes)
            const notificationTime = new Date(notification.createdAt)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
            
            if (!notification.read && notificationTime > fiveMinutesAgo) {
              showNotification({
                id: notification.id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                actionBy: notification.actionBy,
                relatedTo: notification.relatedTo,
                metadata: notification.metadata,
                createdAt: notification.createdAt
              })
            }
          })
          
          setLastNotificationCheck(new Date())
        }
      } catch (error) {
        console.error('Error polling notifications:', error)
      }
    }

    // Initial poll
    pollNotifications()

    // Poll every 30 seconds
    const interval = setInterval(pollNotifications, 30000)

    return () => clearInterval(interval)
  }, [user?.id, lastNotificationCheck, showNotification])

  // Listen for real-time notification events (if you have WebSocket/SSE)
  useEffect(() => {
    if (!user?.id) return

    // Listen for custom notification events
    const handleNewNotification = (event: CustomEvent) => {
      const notification = event.detail
      if (notification && notification.id) {
        showNotification(notification)
      }
    }

    // Listen for mobile notification fallback events
    const handleMobileNotificationFallback = (event: CustomEvent) => {
      const notification = event.detail
      if (notification) {
        showNotification({
          id: Date.now().toString(),
          type: 'mobile_fallback',
          title: notification.title,
          message: notification.body,
          createdAt: new Date().toISOString(),
          metadata: notification.data
        })
      }
    }

    window.addEventListener('new-notification', handleNewNotification as EventListener)
    window.addEventListener('mobile-notification-fallback', handleMobileNotificationFallback as EventListener)

    return () => {
      window.removeEventListener('new-notification', handleNewNotification as EventListener)
      window.removeEventListener('mobile-notification-fallback', handleMobileNotificationFallback as EventListener)
    }
  }, [user?.id, showNotification])

  const contextValue: NotificationContextType = {
    showNotification,
    dismissNotification,
    clearAllNotifications
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationToastContainer 
        notifications={notifications}
        onDismiss={dismissNotification}
        onNavigate={clearAllNotifications}
      />
    </NotificationContext.Provider>
  )
} 