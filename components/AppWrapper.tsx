"use client"

import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import AppLoadingScreen from './AppLoadingScreen'
import ErrorBoundary from './ErrorBoundary'

interface AppWrapperProps {
  children: React.ReactNode
}

export default function AppWrapper({ children }: AppWrapperProps) {
  const [isAppReady, setIsAppReady] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("Initializing app...")
  const [initializationError, setInitializationError] = useState<Error | null>(null)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[AppWrapper] Starting app initialization...')
        
        // Check if we're in a mobile environment
        const isMobile = Capacitor.isNativePlatform()
        
        if (isMobile) {
          setLoadingMessage("Setting up mobile app...")
          
          // Wait for mobile initialization to complete
          await new Promise(resolve => {
            const checkMobileInit = () => {
              // Check if mobile initialization is complete
              if ((window as any).__mobileInitComplete) {
                resolve(void 0)
              } else {
                setTimeout(checkMobileInit, 100)
              }
            }
            
            // Set a timeout in case mobile init doesn't complete
            setTimeout(() => {
              console.warn('[AppWrapper] Mobile initialization timeout, proceeding anyway')
              resolve(void 0)
            }, 5000)
            
            checkMobileInit()
          })
        } else {
          setLoadingMessage("Loading web app...")
          // For web, just wait a bit for hydration
          await new Promise(resolve => setTimeout(resolve, 800))
        }

        setLoadingMessage("Checking authentication...")
        await new Promise(resolve => setTimeout(resolve, 300))

        setLoadingMessage("Loading your data...")
        await new Promise(resolve => setTimeout(resolve, 400))

        setLoadingMessage("Almost ready...")
        await new Promise(resolve => setTimeout(resolve, 200))

        console.log('[AppWrapper] App initialization complete')
        setIsAppReady(true)

      } catch (error) {
        console.error('[AppWrapper] App initialization failed:', error)
        setInitializationError(error as Error)
        
        // Still mark as ready after a delay to prevent infinite loading
        setTimeout(() => {
          setIsAppReady(true)
        }, 2000)
      }
    }

    // Start initialization after a brief delay to ensure DOM is ready
    const initTimeout = setTimeout(initializeApp, 100)

    return () => {
      clearTimeout(initTimeout)
    }
  }, [])

  // Show error boundary if initialization failed
  if (initializationError) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Initialization Failed
            </h1>
            <p className="text-gray-600 mb-6">
              The app failed to initialize properly. Please restart the app.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Restart App
            </button>
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  // Show loading screen while initializing
  if (!isAppReady) {
    return <AppLoadingScreen isLoading={true} message={loadingMessage} />
  }

  // Render the main app
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}

// Hook to check app readiness
export function useAppReady() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Check if app is ready
    const checkReady = () => {
      // Simple check for DOM readiness
      if (document.readyState === 'complete') {
        setIsReady(true)
      } else {
        document.addEventListener('readystatechange', () => {
          if (document.readyState === 'complete') {
            setIsReady(true)
          }
        })
      }
    }

    checkReady()
  }, [])

  return isReady
} 