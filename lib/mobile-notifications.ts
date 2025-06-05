import { PushNotifications } from '@capacitor/push-notifications'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import { Toast } from '@capacitor/toast'

export interface MobileNotificationData {
  id?: string
  title: string
  body: string
  data?: Record<string, any>
  actionTypeId?: string
  attachments?: Array<{
    id: string
    url: string
    options?: any
  }>
}

/**
 * Mobile notification service for handling push and local notifications
 */
export class MobileNotificationService {
  private static isInitialized = false
  private static deviceToken: string | null = null

  /**
   * Initialize push notifications on mobile platforms
   */
  static async initialize(): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || this.isInitialized) {
      return this.isInitialized
    }

    try {
      console.log('Initializing mobile notifications...')

      // Request permission for push notifications
      const permStatus = await PushNotifications.requestPermissions()
      
      if (permStatus.receive !== 'granted') {
        console.warn('Push notification permissions not granted')
        return false
      }

      // Request permission for local notifications
      const localPermStatus = await LocalNotifications.requestPermissions()
      
      if (localPermStatus.display !== 'granted') {
        console.warn('Local notification permissions not granted')
      }

      // Register for push notifications
      await PushNotifications.register()

      // Set up push notification listeners
      this.setupPushNotificationListeners()

      // Set up local notification listeners
      this.setupLocalNotificationListeners()

      this.isInitialized = true
      console.log('Mobile notifications initialized successfully')

      return true
    } catch (error) {
      console.error('Failed to initialize mobile notifications:', error)
      return false
    }
  }

  /**
   * Setup push notification event listeners
   */
  private static setupPushNotificationListeners(): void {
    // On successful registration
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ', token.value)
      this.deviceToken = token.value
      
      // Send token to your server
      this.sendTokenToServer(token.value)
    })

    // On registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error: ', error.error)
    })

    // Show notification when app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received: ', notification)
      
      // Show local notification if app is in foreground
      this.showLocalNotification({
        title: notification.title || 'New Notification',
        body: notification.body || '',
        data: notification.data
      })
    })

    // Handle notification tap
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed: ', notification)
      
      // Handle the action
      this.handleNotificationAction(notification.notification)
    })
  }

  /**
   * Setup local notification event listeners
   */
  private static setupLocalNotificationListeners(): void {
    LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('Local notification received: ', notification)
    })

    LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
      console.log('Local notification action performed: ', notificationAction)
      
      // Handle the action
      this.handleNotificationAction(notificationAction.notification)
    })
  }

  /**
   * Send device token to server
   */
  private static async sendTokenToServer(token: string): Promise<void> {
    try {
      const response = await fetch('/api/v1/mobile/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          token,
          platform: Capacitor.getPlatform(),
          deviceInfo: {
            platform: Capacitor.getPlatform(),
            version: await Capacitor.getVersionCode?.() || 'unknown'
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to register token: ${response.status}`)
      }

      console.log('Device token registered successfully')
    } catch (error) {
      console.error('Failed to send token to server:', error)
    }
  }

  /**
   * Show a local notification
   */
  static async showLocalNotification(notification: MobileNotificationData): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // Fallback to browser notification or toast for web
      this.showWebFallbackNotification(notification)
      return
    }

    try {
      await LocalNotifications.schedule({
        notifications: [{
          title: notification.title,
          body: notification.body,
          id: notification.id ? parseInt(notification.id) : Date.now(),
          schedule: { at: new Date(Date.now() + 1000) }, // Show immediately
          sound: 'default',
          attachments: notification.attachments,
          actionTypeId: notification.actionTypeId,
          extra: notification.data
        }]
      })
    } catch (error) {
      console.error('Failed to show local notification:', error)
      // Fallback to toast
      this.showToast(notification.title)
    }
  }

  /**
   * Show a toast notification (fallback)
   */
  static async showToast(message: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Toast (web fallback):', message)
      return
    }

    try {
      await Toast.show({
        text: message,
        duration: 'short',
        position: 'top'
      })
    } catch (error) {
      console.error('Failed to show toast:', error)
    }
  }

  /**
   * Web fallback for notifications
   */
  private static showWebFallbackNotification(notification: MobileNotificationData): void {
    // Use the existing web notification system
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/icon-192.png',
        data: notification.data
      })
    } else {
      // Show a visual notification in the UI
      console.log('Web notification fallback:', notification)
      
      // Dispatch custom event for UI components to handle
      window.dispatchEvent(new CustomEvent('mobile-notification-fallback', {
        detail: notification
      }))
    }
  }

  /**
   * Handle notification actions (tap, etc.)
   */
  private static handleNotificationAction(notification: any): void {
    console.log('Handling notification action:', notification)
    
    const data = notification.data || notification.extra
    
    if (data?.type === 'location') {
      window.location.href = `/map?location=${data.locationId}`
    } else if (data?.type === 'event_request') {
      window.location.href = '/events/requests'
    } else if (data?.type === 'journey_invite') {
      window.location.href = `/events/journey/${data.planId}`
    } else if (data?.type === 'new_review') {
      window.location.href = `/map?location=${data.locationId}#reviews`
    } else if (data?.url) {
      window.location.href = data.url
    } else {
      // Default action - go to notifications page
      window.location.href = '/notifications'
    }
  }

  /**
   * Get the current device token
   */
  static getDeviceToken(): string | null {
    return this.deviceToken
  }

  /**
   * Check if notifications are supported and permitted
   */
  static async checkPermissions(): Promise<{
    pushPermission: string
    localPermission: string
  }> {
    if (!Capacitor.isNativePlatform()) {
      return {
        pushPermission: 'denied',
        localPermission: 'denied'
      }
    }

    try {
      const [pushPerm, localPerm] = await Promise.all([
        PushNotifications.checkPermissions(),
        LocalNotifications.checkPermissions()
      ])

      return {
        pushPermission: pushPerm.receive,
        localPermission: localPerm.display
      }
    } catch (error) {
      console.error('Failed to check notification permissions:', error)
      return {
        pushPermission: 'denied',
        localPermission: 'denied'
      }
    }
  }

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false
    }

    try {
      const [pushPerm, localPerm] = await Promise.all([
        PushNotifications.requestPermissions(),
        LocalNotifications.requestPermissions()
      ])

      const hasPermissions = pushPerm.receive === 'granted' && localPerm.display === 'granted'
      
      if (hasPermissions && !this.isInitialized) {
        await this.initialize()
      }

      return hasPermissions
    } catch (error) {
      console.error('Failed to request notification permissions:', error)
      return false
    }
  }

  /**
   * Clear all pending local notifications
   */
  static async clearNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return

    try {
      await LocalNotifications.cancel({
        notifications: await LocalNotifications.getPending()
      })
      console.log('Cleared all pending notifications')
    } catch (error) {
      console.error('Failed to clear notifications:', error)
    }
  }

  /**
   * Schedule a notification for later
   */
  static async scheduleNotification(
    notification: MobileNotificationData & { scheduleAt: Date }
  ): Promise<void> {
    if (!Capacitor.isNativePlatform()) return

    try {
      await LocalNotifications.schedule({
        notifications: [{
          title: notification.title,
          body: notification.body,
          id: notification.id ? parseInt(notification.id) : Date.now(),
          schedule: { at: notification.scheduleAt },
          sound: 'default',
          attachments: notification.attachments,
          actionTypeId: notification.actionTypeId,
          extra: notification.data
        }]
      })
      console.log('Notification scheduled successfully')
    } catch (error) {
      console.error('Failed to schedule notification:', error)
    }
  }
} 