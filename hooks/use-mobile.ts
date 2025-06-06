import * as React from "react"
import { useEffect, useState } from 'react'
import { 
  isNative, 
  getPlatform, 
  canUseCamera, 
  canUseGeolocation, 
  canUseHaptics,
  takePicture,
  pickImage,
  getCurrentPosition,
  shareContent,
  showToast,
  vibrate,
  openUrl
} from '@/lib/capacitor-utils'

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

interface MobileState {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouchDevice: boolean
  isPortrait: boolean
  screenWidth: number
  screenHeight: number
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useResponsive(): MobileState {
  const [state, setState] = React.useState<MobileState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    isPortrait: false,
    screenWidth: 0,
    screenHeight: 0,
  })

  React.useEffect(() => {
    const updateState = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      setState({
        isMobile: width < MOBILE_BREAKPOINT,
        isTablet: width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
        isDesktop: width >= TABLET_BREAKPOINT,
        isTouchDevice,
        isPortrait: height > width,
        screenWidth: width,
        screenHeight: height,
      })
    }

    // Initial state
    updateState()

    // Listen for window resize
    window.addEventListener('resize', updateState)
    
    // Listen for orientation change (mobile specific)
    window.addEventListener('orientationchange', () => {
      // Delay to account for browser reflow
      setTimeout(updateState, 100)
    })

    return () => {
      window.removeEventListener('resize', updateState)
      window.removeEventListener('orientationchange', updateState)
    }
  }, [])

  return state
}

// Hook for detecting specific mobile platforms
export function usePlatform() {
  const [platform, setPlatform] = React.useState({
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
    isPWA: false,
    canInstall: false,
  })

  React.useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(userAgent) || 
                  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    const isAndroid = /android/.test(userAgent)
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent) && !/firefox/.test(userAgent)
    const isChrome = /chrome/.test(userAgent) && !/edge/.test(userAgent)
    
    // Check if running as PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.matchMedia('(display-mode: fullscreen)').matches ||
                  (window.navigator as any).standalone === true

    // Check if can install PWA
    const canInstall = 'beforeinstallprompt' in window

    setPlatform({
      isIOS,
      isAndroid,
      isSafari,
      isChrome,
      isPWA,
      canInstall,
    })
  }, [])

  return platform
}

// Hook for managing mobile-specific viewport
export function useViewport() {
  const [viewport, setViewport] = React.useState({
    width: 0,
    height: 0,
    visualViewportHeight: 0,
    safeAreaTop: 0,
    safeAreaBottom: 0,
  })

  React.useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const visualViewportHeight = window.visualViewport?.height || height
      
      // Try to detect safe area (for notched devices)
      const computedStyle = getComputedStyle(document.documentElement)
      const safeAreaTop = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)')) || 0
      const safeAreaBottom = parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)')) || 0

      setViewport({
        width,
        height,
        visualViewportHeight,
        safeAreaTop,
        safeAreaBottom,
      })

      // Update CSS custom properties for use in components
      // Add a small delay to prevent hydration conflicts
      setTimeout(() => {
        document.documentElement.style.setProperty('--viewport-height', `${height}px`)
        document.documentElement.style.setProperty('--visual-viewport-height', `${visualViewportHeight}px`)
        document.documentElement.style.setProperty('--safe-area-top', `${safeAreaTop}px`)
        document.documentElement.style.setProperty('--safe-area-bottom', `${safeAreaBottom}px`)
      }, 100)
    }

    updateViewport()

    window.addEventListener('resize', updateViewport)
    window.addEventListener('orientationchange', () => {
      setTimeout(updateViewport, 100)
    })

    // Listen for visual viewport changes (mobile keyboard, etc.)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport)
    }

    return () => {
      window.removeEventListener('resize', updateViewport)
      window.removeEventListener('orientationchange', updateViewport)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport)
      }
    }
  }, [])

  return viewport
}

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)
  const [platform, setPlatform] = useState<string>('')
  const [isReady, setIsReady] = useState(false)
  const [features, setFeatures] = useState({
    camera: false,
    geolocation: false,
    haptics: false,
  })

  useEffect(() => {
    // Check if we're running in a native environment
    const checkMobile = async () => {
      try {
        // Import functions dynamically to prevent SSR issues
        const { isNative, getPlatform, canUseCamera, canUseGeolocation, canUseHaptics } = await import('@/lib/capacitor-utils')
        
        const mobile = await isNative()
        const currentPlatform = await getPlatform()
        
        setIsMobile(mobile)
        setPlatform(currentPlatform)
        
        // Check features asynchronously
        const [camera, geolocation, haptics] = await Promise.all([
          canUseCamera(),
          canUseGeolocation(),
          canUseHaptics(),
        ])
        
        setFeatures({
          camera,
          geolocation,
          haptics,
        })
        
        setIsReady(true)
      } catch (error) {
        console.error('Error checking mobile capabilities:', error)
        // Set fallback values and mark as ready
        setIsMobile(false)
        setPlatform('web')
        setFeatures({
          camera: false,
          geolocation: false,
          haptics: false,
        })
        setIsReady(true)
      }
    }

    // Wait for capacitor to be ready
    if (typeof window !== 'undefined') {
      checkMobile()
    } else {
      // Server-side, set defaults
      setIsReady(true)
    }
  }, [])

  // Import actions dynamically to prevent SSR issues
  const getActions = async () => {
    try {
      const { takePicture, pickImage, getCurrentPosition, shareContent, showToast, vibrate, openUrl } = await import('@/lib/capacitor-utils')
      return {
        takePicture,
        pickImage,
        getCurrentPosition,
        shareContent,
        showToast,
        vibrate,
        openUrl,
      }
    } catch (error) {
      console.error('Error loading mobile actions:', error)
      return {}
    }
  }

  return {
    isMobile,
    platform,
    isReady,
    features,
    getActions, // Return a function to get actions asynchronously
  }
}
