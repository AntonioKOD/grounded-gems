"use client"

import { useEffect, useState, useRef } from 'react'

interface MobileAppWrapperProps {
  children: React.ReactNode
}

export default function MobileAppWrapper({ children }: MobileAppWrapperProps) {
  const [isMounted, setIsMounted] = useState(false)
  const initRef = useRef(false)

  // Simple mount and mobile initialization
  useEffect(() => {
    setIsMounted(true)

    const initMobileApp = async () => {
      if (initRef.current) return
      initRef.current = true

      try {
        console.log('🚀 [MobileApp] Initializing...')
        console.log('✅ [MobileApp] Ready')

      } catch (error) {
        console.error('❌ [MobileApp] Init error:', error)
        // Continue anyway - don't block the app
      }
    }

    // Start initialization in background
    initMobileApp()
  }, [])

  // Prevent flash during SSR
  if (!isMounted) {
    return <>{children}</>
  }

  // Always render children - no loading states
  return <>{children}</>
} 