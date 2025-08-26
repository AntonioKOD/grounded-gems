"use client"

import { useEffect, useState } from 'react'
import { 
  isNotificationSupported, 
  getNotificationPermission, 
  requestNotificationPermission,
  initializeNotifications,
  showTestNotification 
} from '@/lib/notifications'
import { registerServiceWorker } from '@/lib/pwa'

interface NotificationInitializerProps {
  children: React.ReactNode
  autoRequestPermission?: boolean
  showWelcomeNotification?: boolean
}

export default function NotificationInitializer({ 
  children, 
  autoRequestPermission = true,
  showWelcomeNotification = true 
}: NotificationInitializerProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeNotificationSystem = async () => {
      try {
        console.log('🔔 [NotificationInitializer] Starting notification system initialization...')
        
        // Check browser support
        const supported = isNotificationSupported()
        setIsSupported(supported)
        
        if (!supported) {
          console.warn('🔔 [NotificationInitializer] Notifications not supported in this browser')
          setIsInitialized(true)
          return
        }

        // Register service worker first
        console.log('🔔 [NotificationInitializer] Registering service worker...')
        const swRegistration = await registerServiceWorker()
        
        if (!swRegistration) {
          console.error('🔔 [NotificationInitializer] Failed to register service worker')
          setError('Service worker registration failed')
          setIsInitialized(true)
          return
        }

        console.log('🔔 [NotificationInitializer] Service worker registered successfully')

        // Check current permission status
        const currentPermission = getNotificationPermission()
        setPermissionStatus(currentPermission)
        
        console.log('🔔 [NotificationInitializer] Current permission status:', currentPermission)

        // If permission is already granted, we're good to go
        if (currentPermission === 'granted') {
          console.log('🔔 [NotificationInitializer] Permission already granted')
          
          if (showWelcomeNotification) {
            // Show a subtle welcome notification
            setTimeout(() => {
              showTestNotification().catch(console.error)
            }, 2000)
          }
          
          setIsInitialized(true)
          return
        }

        // If permission is denied, don't auto-request
        if (currentPermission === 'denied') {
          console.log('🔔 [NotificationInitializer] Permission denied, not auto-requesting')
          setIsInitialized(true)
          return
        }

        // If auto-request is enabled and permission is default, request it
        if (autoRequestPermission && currentPermission === 'default') {
          console.log('🔔 [NotificationInitializer] Requesting notification permission...')
          
          try {
            const newPermission = await requestNotificationPermission()
            setPermissionStatus(newPermission)
            
            if (newPermission === 'granted') {
              console.log('🔔 [NotificationInitializer] Permission granted!')
              
              // Initialize notifications with welcome message
              if (showWelcomeNotification) {
                await initializeNotifications()
              }
              
              // Set up push subscription if supported
              await setupPushSubscription(swRegistration)
              
            } else {
              console.log('🔔 [NotificationInitializer] Permission denied by user')
            }
          } catch (permissionError) {
            console.error('🔔 [NotificationInitializer] Error requesting permission:', permissionError)
            setError('Failed to request notification permission')
          }
        }

        setIsInitialized(true)
        
      } catch (error) {
        console.error('🔔 [NotificationInitializer] Initialization error:', error)
        setError('Notification system initialization failed')
        setIsInitialized(true)
      }
    }

    initializeNotificationSystem()
  }, [autoRequestPermission, showWelcomeNotification])

  // Set up push subscription for web push notifications
  const setupPushSubscription = async (registration: ServiceWorkerRegistration) => {
    try {
      console.log('🔔 [NotificationInitializer] Setting up push subscription...')
      
      // Check if push manager is supported
      if (!('PushManager' in window)) {
        console.log('🔔 [NotificationInitializer] Push notifications not supported')
        return
      }

      // Check if we already have a subscription
      let subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        console.log('🔔 [NotificationInitializer] Push subscription already exists')
        return
      }

      // Get VAPID public key from server
      const vapidResponse = await fetch('/api/notifications/vapid-public-key')
      if (!vapidResponse.ok) {
        console.log('🔔 [NotificationInitializer] VAPID key not available, skipping push subscription')
        return
      }
      
      const { publicKey } = await vapidResponse.json()
      
      if (!publicKey) {
        console.log('🔔 [NotificationInitializer] No VAPID public key received')
        return
      }

      // Convert VAPID key to Uint8Array
      const vapidPublicKey = urlBase64ToUint8Array(publicKey)
      
      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      })

      console.log('🔔 [NotificationInitializer] Push subscription created:', subscription)

      // Send subscription to server
      await sendSubscriptionToServer(subscription)
      
    } catch (error) {
      console.error('🔔 [NotificationInitializer] Error setting up push subscription:', error)
      // Don't fail the entire initialization for push subscription errors
    }
  }

  // Convert VAPID key from base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // Send push subscription to server
  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    try {
      const response = await fetch('/api/notifications/register-push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      })

      if (response.ok) {
        console.log('🔔 [NotificationInitializer] Push subscription registered with server')
      } else {
        console.error('🔔 [NotificationInitializer] Failed to register push subscription with server')
      }
    } catch (error) {
      console.error('🔔 [NotificationInitializer] Error sending subscription to server:', error)
    }
  }

  // Show initialization status in development
  if (process.env.NODE_ENV === 'development' && !isInitialized) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-blue-100 border border-blue-300 rounded-lg p-3 text-sm">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Initializing notifications...</span>
        </div>
      </div>
    )
  }

  // Show error in development
  if (process.env.NODE_ENV === 'development' && error) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-300 rounded-lg p-3 text-sm">
        <div className="text-red-700">Notification Error: {error}</div>
      </div>
    )
  }

  return <>{children}</>
}
