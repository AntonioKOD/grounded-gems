"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Capacitor } from '@capacitor/core'

interface AppLoadingScreenProps {
  isLoading: boolean
  message?: string
}

export default function AppLoadingScreen({ isLoading, message = "Loading..." }: AppLoadingScreenProps) {
  const [progress, setProgress] = useState(0)
  const [currentMessage, setCurrentMessage] = useState(message)

  useEffect(() => {
    if (!isLoading) return

    const messages = [
      "Initializing app...",
      "Loading your data...",
      "Setting up notifications...",
      "Almost ready..."
    ]

    let messageIndex = 0
    let progressValue = 0

    const progressInterval = setInterval(() => {
      progressValue += Math.random() * 15 + 5 // Random progress between 5-20%
      
      if (progressValue >= 100) {
        progressValue = 100
        clearInterval(progressInterval)
      }
      
      setProgress(Math.min(progressValue, 100))
    }, 200)

    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length
      setCurrentMessage(messages[messageIndex])
    }, 800)

    return () => {
      clearInterval(progressInterval)
      clearInterval(messageInterval)
    }
  }, [isLoading])

  useEffect(() => {
    setCurrentMessage(message)
  }, [message])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4]">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full"></div>
        <div className="absolute top-1/4 right-16 w-12 h-12 bg-white rounded-full"></div>
        <div className="absolute bottom-1/4 left-1/4 w-16 h-16 bg-white rounded-full"></div>
        <div className="absolute bottom-16 right-1/3 w-8 h-8 bg-white rounded-full"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center p-8 max-w-sm mx-auto">
        {/* Logo */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Image
              src="/logo-mobile.svg"
              alt="Grounded Gems"
              width={64}
              height={64}
              className="w-16 h-16 object-contain"
              priority
            />
          </div>
          
          {/* Pulse animation */}
          <div className="absolute inset-0 w-24 h-24 bg-white/10 rounded-2xl animate-pulse"></div>
        </div>

        {/* App name */}
        <h1 className="text-2xl font-bold text-white mb-2 text-center">
          Grounded Gems
        </h1>
        
        {/* Loading message */}
        <p className="text-white/90 text-sm mb-8 text-center min-h-[20px]">
          {currentMessage}
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-xs mb-4">
          <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Progress percentage */}
        <p className="text-white/70 text-xs">
          {Math.round(progress)}%
        </p>

        {/* Animated dots */}
        <div className="flex space-x-1 mt-4">
          <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
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