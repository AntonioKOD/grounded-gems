"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Capacitor } from '@capacitor/core'

interface AppLoadingScreenProps {
  isLoading: boolean
  message?: string
}

export default function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-stone-900 via-amber-900 to-stone-800">
      {/* Animated geometric pattern background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-amber-300/30 rotate-45 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-24 h-24 border border-stone-300/20 rotate-12 animate-bounce"></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 border border-amber-400/25 -rotate-12 animate-pulse delay-1000"></div>
      </div>
      
      <div className="text-center z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-lg animate-pulse"></div>
            <Image
              src="https://i.imgur.com/btJCRer.png"
              width={120}
              height={120}
              alt="Sacavia"
              className="relative rounded-full shadow-2xl ring-4 ring-amber-300/30"
              priority
            />
          </div>
        </div>
        
        {/* App Name */}
        <h1 className="text-4xl md:text-5xl font-bold text-amber-100 mb-4 tracking-wide">
          Sacavia
        </h1>
        
        {/* Tagline */}
        <p className="text-stone-300 text-lg md:text-xl mb-8 max-w-md mx-auto leading-relaxed">
          Guided by wisdom, connected by stories
        </p>
        
        {/* Loading indicator */}
        <div className="flex justify-center items-center space-x-2">
          <div className="w-3 h-3 bg-amber-400 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-amber-300 rounded-full animate-bounce delay-100"></div>
          <div className="w-3 h-3 bg-stone-400 rounded-full animate-bounce delay-200"></div>
        </div>
        
        <p className="text-stone-400 text-sm mt-6 animate-fade-in-up delay-500">
          Preparing your journey...
        </p>
      </div>
    </div>
  )
}

// Simplified loading spinner for smaller use cases
export function LoadingSpinner({ size = "default" }: { size?: "small" | "default" | "large" }) {
  const sizeClasses = {
    small: "w-4 h-4",
    default: "w-6 h-6", 
    large: "w-8 h-8"
  }

  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-[#FF6B6B]`} />
  )
}

// Hook to manage app loading state
export function useAppLoading() {
  const [isLoading, setIsLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState("Initializing app...")

  useEffect(() => {
    // Simulate app initialization
    const initializeApp = async () => {
      try {
        setLoadingMessage("Checking authentication...")
        await new Promise(resolve => setTimeout(resolve, 500))

        if (Capacitor.isNativePlatform()) {
          setLoadingMessage("Setting up mobile features...")
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        setLoadingMessage("Loading your data...")
        await new Promise(resolve => setTimeout(resolve, 500))

        setLoadingMessage("Almost ready...")
        await new Promise(resolve => setTimeout(resolve, 300))

        setIsLoading(false)
      } catch (error) {
        console.error('App initialization failed:', error)
        setLoadingMessage("Loading failed, retrying...")
        // Retry after a delay
        setTimeout(() => {
          setIsLoading(false)
        }, 1000)
      }
    }

    initializeApp()
  }, [])

  return {
    isLoading,
    loadingMessage,
    setLoadingMessage,
    setIsLoading
  }
} 