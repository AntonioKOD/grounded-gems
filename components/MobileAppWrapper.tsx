"use client"

import { useEffect, useState, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { useRouter } from 'next/navigation'

interface MobileAppWrapperProps {
  children: React.ReactNode
}

export default function MobileAppWrapper({ children }: MobileAppWrapperProps) {
  const [isReady, setIsReady] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const router = useRouter()
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const initMobileApp = async () => {
      try {
        const platform = Capacitor.getPlatform()
        const isIOSDevice = platform === 'ios'
        setIsIOS(isIOSDevice)

        console.log('🚀 [MobileApp] Initializing...', { platform })

        if (Capacitor.isNativePlatform()) {
          // Fast mobile-specific initialization
          await initializeCapacitorPlugins()
          await handleAuthState()
        }

        setIsReady(true)
        console.log('✅ [MobileApp] Ready')

      } catch (error) {
        console.error('❌ [MobileApp] Init error:', error)
        // Still set ready to prevent hanging
        setIsReady(true)
      }
    }

    initMobileApp()
  }, [])

  const initializeCapacitorPlugins = async () => {
    try {
      // Only initialize essential plugins
      const [
        { SplashScreen },
        { StatusBar, Style },
        { App }
      ] = await Promise.all([
        import('@capacitor/splash-screen'),
        import('@capacitor/status-bar'),
        import('@capacitor/app')
      ])

      // Hide splash screen immediately for faster perceived performance
      await SplashScreen.hide({ fadeOutDuration: 100 })

      // Set status bar quickly
      if (isIOS) {
        await StatusBar.setStyle({ style: Style.Dark })
        await StatusBar.setBackgroundColor({ color: '#FF6B6B' })
      }

      // Handle app state changes efficiently
      App.addListener('appStateChange', (state) => {
        console.log('📱 App state:', state.isActive ? 'foreground' : 'background')
        
        if (!state.isActive) {
          // Clean up when going to background
          console.log('🧹 Cleaning up for background')
        }
      })

      console.log('🔌 Capacitor plugins initialized')
    } catch (error) {
      console.error('🔌 Plugin init error:', error)
    }
  }

  const handleAuthState = async () => {
    try {
      // Quick auth check without heavy operations
      const response = await fetch('/api/users/me', {
        credentials: 'include',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          console.log('👤 User authenticated')
          // Only redirect if we're on login page
          if (window.location.pathname === '/login') {
            router.replace('/feed')
          }
        } else {
          console.log('👤 No user found')
          // Only redirect if we're on a protected page
          const protectedPaths = ['/feed', '/profile', '/map', '/notifications']
          if (protectedPaths.some(path => window.location.pathname.startsWith(path))) {
            router.replace('/login')
          }
        }
      } else {
        console.log('👤 Auth check failed:', response.status)
        if (response.status === 401 && window.location.pathname !== '/login') {
          router.replace('/login')
        }
      }
    } catch (error) {
      console.error('👤 Auth check error:', error)
      // Don't redirect on error, let user stay where they are
    }
  }

  // Show minimal loading for mobile apps
  if (!isReady && Capacitor.isNativePlatform()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#ff6b6b] to-[#4ecdc4]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-medium">Loading Grounded Gems...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 