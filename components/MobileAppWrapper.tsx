"use client"

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface MobileAppWrapperProps {
  children: React.ReactNode
}

export default function MobileAppWrapper({ children }: MobileAppWrapperProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isCapacitor, setIsCapacitor] = useState(false)
  const router = useRouter()
  const initRef = useRef(false)

  // Simple mount check for hydration safety
  useEffect(() => {
    setIsMounted(true)
    
    // Simple ready state - no auth checks needed since middleware handles this
    const readyTimer = setTimeout(() => {
      setIsReady(true)
    }, 100)

    return () => clearTimeout(readyTimer)
  }, [])

  useEffect(() => {
    if (!isMounted || initRef.current) return
    initRef.current = true

    const initMobileApp = async () => {
      try {
        // Import capacitor utils dynamically to prevent SSR issues
        const { isCapacitorApp, initializeCapacitorApp, getPlatform } = await import('../lib/capacitor-utils')
        
        const platform = await getPlatform()
        const isIOSDevice = platform === 'ios'
        const isCapacitorDevice = await isCapacitorApp()
        
        setIsIOS(isIOSDevice)
        setIsCapacitor(isCapacitorDevice)

        console.log('🚀 [MobileApp] Initializing...', { platform, isCapacitorDevice })

        if (isCapacitorDevice) {
          // Use the new Capacitor utilities
          await initializeCapacitorApp()
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
  }, [isMounted])



  // Prevent flash during SSR
  if (!isMounted) {
    return <>{children}</>
  }

  // Show minimal loading for mobile apps only if needed
  if (!isReady && isCapacitor) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#ff6b6b] to-[#4ecdc4]">
        <div className="bg-gradient-to-br from-stone-900 via-amber-900 to-stone-800 p-6 rounded-lg text-center">
          <h3 className="text-xl font-semibold mb-2 text-amber-100">Welcome to Sacavia</h3>
          <p className="text-stone-300 mb-4">Your guide to authentic discovery</p>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-amber-300 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce delay-200"></div>
          </div>
          <p className="text-amber-200 font-medium mt-4">Loading Sacavia...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 