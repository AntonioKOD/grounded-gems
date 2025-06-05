'use client'

import { useEffect } from 'react'

/**
 * SafeAreaManager - Handles CSS custom properties for safe areas on iOS devices
 * This component runs purely client-side to prevent hydration mismatches
 * with env() CSS functions that are only available in the browser
 */
export default function SafeAreaManager() {
  useEffect(() => {
    // Only run on iOS devices
    if (typeof window === 'undefined') return
    
    const isIOS = window.Capacitor?.getPlatform?.() === 'ios'
    if (!isIOS) return

    // Set CSS custom properties for safe areas
    const root = document.documentElement
    
    // Only set if not already set to prevent redundant updates
    const currentTop = getComputedStyle(root).getPropertyValue('--safe-area-inset-top')
    if (!currentTop || currentTop.trim() === '' || currentTop === '0px') {
      // Set standard safe area variables
      root.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top, 0px)')
      root.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom, 0px)')
      root.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left, 0px)')
      root.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right, 0px)')
      
      // Set mobile-specific safe area variables
      root.style.setProperty('--mobile-safe-area-top', 'env(safe-area-inset-top, 0px)')
      root.style.setProperty('--mobile-safe-area-bottom', 'env(safe-area-inset-bottom, 0px)')
      
      console.log('[SafeAreaManager] CSS variables set for iOS')
    }
  }, [])

  // This component doesn't render anything
  return null
} 