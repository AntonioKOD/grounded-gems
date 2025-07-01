"use client"

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { MobileNotificationService } from '@/lib/mobile-notifications'
import { useUser } from '@/context/user-context'

/**
 * Mobile App Initialization Component
 * Handles mobile-specific initialization like notifications and auth restoration
 */
export default function MobileAppInit() {
  const { isAuthenticated, user } = useUser()

  useEffect(() => {
    const initializeMobileFeatures = async () => {
      // Only run on mobile platforms
      if (!Capacitor.isNativePlatform()) {
        return
      }

      console.log('Initializing mobile app features...')

      try {
        // Initialize mobile notifications
        const notificationsInitialized = await MobileNotificationService.initialize()
        
        if (notificationsInitialized) {
          console.log('Mobile notifications initialized successfully')
        } else {
          console.warn('Failed to initialize mobile notifications')
        }

        // Check and request notification permissions if user is authenticated
        if (isAuthenticated) {
          const permissions = await MobileNotificationService.checkPermissions()
          
          if (permissions.pushPermission !== 'granted' || permissions.localPermission !== 'granted') {
            console.log('Requesting notification permissions...')
            const granted = await MobileNotificationService.requestPermissions()
            
            if (granted) {
              console.log('Notification permissions granted')
              
              // Show welcome notification
              setTimeout(() => {
                MobileNotificationService.showLocalNotification({
                  title: '🎉 Welcome to Sacavia!',
                  body: 'Your guide to authentic discovery is ready. Start exploring meaningful places in your community.',
                  data: { type: 'welcome' }
                })
              }, 2000)
            } else {
              console.log('Notification permissions denied')
            }
          }
        }

      } catch (error) {
        console.error('Failed to initialize mobile features:', error)
      }
    }

    // Initialize on mount
    initializeMobileFeatures()
  }, [isAuthenticated, user])

  // Listen for login events to initialize notifications
  useEffect(() => {
    const handleUserLogin = async () => {
      if (!Capacitor.isNativePlatform()) return

      console.log('User logged in, checking notification permissions...')
      
      try {
        const permissions = await MobileNotificationService.checkPermissions()
        
        if (permissions.pushPermission !== 'granted') {
          // Delay the permission request to avoid overwhelming the user
          setTimeout(async () => {
            const granted = await MobileNotificationService.requestPermissions()
            
            if (granted) {
              MobileNotificationService.showLocalNotification({
                title: '🔔 Notifications Enabled',
                body: 'You\'ll now receive updates about your favorite places and events.',
                data: { type: 'notifications_enabled' }
              })
            }
          }, 3000) // Wait 3 seconds after login
        }
      } catch (error) {
        console.error('Failed to handle user login for notifications:', error)
      }
    }

    // Listen for login events
    window.addEventListener('user-login', handleUserLogin)
    window.addEventListener('login-success', handleUserLogin)

    return () => {
      window.removeEventListener('user-login', handleUserLogin)
      window.removeEventListener('login-success', handleUserLogin)
    }
  }, [])

  // The notification fallback is now handled by the NotificationProvider
  // No need for separate handling here

  // This component doesn't render anything visible
  return null
} 