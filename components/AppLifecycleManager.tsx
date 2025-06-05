"use client"

import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'

export default function AppLifecycleManager() {
  const isInitialized = useRef(false)
  const cleanupFunctions = useRef<Array<() => void>>([])

  useEffect(() => {
    if (isInitialized.current) return
    
    const initializeAppLifecycle = async () => {
      try {
        console.log('[AppLifecycle] Initializing app lifecycle management...')
        
        // Clear any existing cleanup functions
        cleanupFunctions.current.forEach(cleanup => {
          try {
            cleanup()
          } catch (error) {
            console.warn('[AppLifecycle] Error during cleanup:', error)
          }
        })
        cleanupFunctions.current = []

        if (Capacitor.isNativePlatform()) {
          const { App: CapacitorApp } = await import('@capacitor/app')
          
          // Handle app URL open events
          const urlOpenListener = CapacitorApp.addListener('appUrlOpen', (event) => {
            console.log('[AppLifecycle] App opened with URL:', event.url)
            // Handle deep links or URL schemes here if needed
          })
          cleanupFunctions.current.push(() => urlOpenListener.remove())

          // Handle app restore events  
          const restoreListener = CapacitorApp.addListener('appRestoredResult', (event) => {
            console.log('[AppLifecycle] App restored from background:', event)
            // Handle app restoration logic here
          })
          cleanupFunctions.current.push(() => restoreListener.remove())

          // Handle back button with better logic
          const backButtonListener = CapacitorApp.addListener('backButton', (event) => {
            console.log('[AppLifecycle] Back button pressed, can go back:', event.canGoBack)
            
            // Let the default behavior handle navigation
            // Only override if we need special handling
            if (!event.canGoBack) {
              // If we can't go back, minimize the app instead of closing
              CapacitorApp.minimizeApp()
            }
          })
          cleanupFunctions.current.push(() => backButtonListener.remove())

          // Handle app state changes with better memory management
          const stateChangeListener = CapacitorApp.addListener('appStateChange', (state) => {
            console.log('[AppLifecycle] App state changed:', state.isActive ? 'active' : 'inactive')
            
            if (!state.isActive) {
              // App is going to background - clean up non-essential resources
              console.log('[AppLifecycle] App backgrounded, cleaning up resources...')
              
              // Clear any running timers or intervals
              if (typeof window !== 'undefined') {
                // Clear any app-specific timers stored in window
                if ((window as any).__appTimers) {
                  (window as any).__appTimers.forEach((timer: number) => {
                    clearTimeout(timer)
                    clearInterval(timer)
                  })
                  delete (window as any).__appTimers
                }
                
                // Clear any cached data that's not needed in background
                if ((window as any).__tempCache) {
                  delete (window as any).__tempCache
                }
              }
            } else {
              // App is coming to foreground - restore if needed
              console.log('[AppLifecycle] App foregrounded, restoring state...')
              
              // Refresh critical data if needed
              const event = new CustomEvent('appForegrounded', { 
                detail: { timestamp: Date.now() } 
              })
              window.dispatchEvent(event)
            }
          })
          cleanupFunctions.current.push(() => stateChangeListener.remove())

          console.log('[AppLifecycle] Native app lifecycle listeners registered')
        } else {
          // Web-specific lifecycle management
          const handleVisibilityChange = () => {
            if (document.hidden) {
              console.log('[AppLifecycle] Web app hidden')
              // Clean up resources when tab is hidden
            } else {
              console.log('[AppLifecycle] Web app visible')
              // Restore when tab becomes visible
            }
          }

          const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            console.log('[AppLifecycle] Web app closing, cleaning up...')
            // Clean up before page unload
            cleanupFunctions.current.forEach(cleanup => {
              try {
                cleanup()
              } catch (error) {
                console.warn('[AppLifecycle] Error during page unload cleanup:', error)
              }
            })
          }

          document.addEventListener('visibilitychange', handleVisibilityChange)
          window.addEventListener('beforeunload', handleBeforeUnload)
          
          cleanupFunctions.current.push(() => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('beforeunload', handleBeforeUnload)
          })

          console.log('[AppLifecycle] Web app lifecycle listeners registered')
        }

        // Global error handling for unhandled rejections
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
          console.error('[AppLifecycle] Unhandled promise rejection:', event.reason)
          // Prevent the error from crashing the app
          event.preventDefault()
        }

        const handleError = (event: ErrorEvent) => {
          console.error('[AppLifecycle] Unhandled error:', event.error)
          // Log but don't crash the app
        }

        window.addEventListener('unhandledrejection', handleUnhandledRejection)
        window.addEventListener('error', handleError)
        
        cleanupFunctions.current.push(() => {
          window.removeEventListener('unhandledrejection', handleUnhandledRejection)
          window.removeEventListener('error', handleError)
        })

        isInitialized.current = true
        console.log('[AppLifecycle] App lifecycle management initialized successfully')

      } catch (error) {
        console.error('[AppLifecycle] Failed to initialize app lifecycle:', error)
      }
    }

    initializeAppLifecycle()

    // Cleanup function
    return () => {
      console.log('[AppLifecycle] Cleaning up app lifecycle manager...')
      cleanupFunctions.current.forEach(cleanup => {
        try {
          cleanup()
        } catch (error) {
          console.warn('[AppLifecycle] Error during component cleanup:', error)
        }
      })
      cleanupFunctions.current = []
      isInitialized.current = false
    }
  }, [])

  // Create global cleanup function
  useEffect(() => {
    (window as any).__appLifecycleCleanup = () => {
      console.log('[AppLifecycle] Global cleanup triggered')
      cleanupFunctions.current.forEach(cleanup => {
        try {
          cleanup()
        } catch (error) {
          console.warn('[AppLifecycle] Error during global cleanup:', error)
        }
      })
      cleanupFunctions.current = []
    }

    return () => {
      if ((window as any).__appLifecycleCleanup) {
        delete (window as any).__appLifecycleCleanup
      }
    }
  }, [])

  return null // This component doesn't render anything
} 