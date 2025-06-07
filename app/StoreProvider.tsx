'use client'
import { useRef, useEffect, useState } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { persistStore } from 'redux-persist'
import { makeStore, AppStore } from '../lib/store'
import { setUser } from '../lib/features/user/userSlice'
import { initializeLikedPosts, initializeSavedPosts } from '../lib/features/posts/postsSlice'
import type { UserData } from '../lib/features/user/userSlice'
import { usePathname } from 'next/navigation'

interface StoreProviderProps {
  children: React.ReactNode
  initialUser?: UserData | null
}

// Optimized minimal loading component with timeout
function MinimalLoading() {
  const [showTimeout, setShowTimeout] = useState(false)

  useEffect(() => {
    // Show timeout message after 2 seconds (reduced from 3)
    const timeoutId = setTimeout(() => {
      setShowTimeout(true)
    }, 2000)

    return () => clearTimeout(timeoutId)
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B6B] mx-auto"></div>
        <div className="space-y-2">
          <p className="text-gray-600 text-sm">Loading Sacavia...</p>
          {showTimeout && (
            <div className="space-y-2">
              <p className="text-gray-500 text-xs">This is taking longer than expected</p>
              <button 
                onClick={() => window.location.reload()} 
                className="text-[#FF6B6B] hover:text-[#FF6B6B]/80 text-xs underline transition-colors"
              >
                Reload page
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StoreProvider({ children, initialUser }: StoreProviderProps) {
  const storeRef = useRef<AppStore | null>(null)
  const persistorRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [shouldSkipLoading, setShouldSkipLoading] = useState(false)
  
  // Check if we're on a public route that doesn't need to wait for persistence
  useEffect(() => {
    const pathname = window.location.pathname
    const publicRoutes = ['/', '/search', '/map', '/locations', '/events']
    const isPublicRoute = publicRoutes.some(route => 
      pathname === route || pathname.startsWith(`${route}/`)
    )
    
    if (isPublicRoute) {
      // For public routes, skip the loading and let persistence happen in background
      setShouldSkipLoading(true)
      setIsReady(true)
    }
  }, [])
  
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore()
    persistorRef.current = persistStore(storeRef.current, {}, () => {
      // Mark as ready once persistence is complete
      setIsReady(true)
    })
    
    // Immediately initialize with user data if available
    if (initialUser) {
      storeRef.current.dispatch(setUser(initialUser))
      
      // Initialize user's liked and saved posts if available
      if (initialUser.id) {
        const likedPostIds = Array.isArray(initialUser.likedPosts) ? initialUser.likedPosts : []
        const savedPostIds = Array.isArray(initialUser.savedPosts) ? initialUser.savedPosts : []
        
        storeRef.current.dispatch(initializeLikedPosts(likedPostIds))
        storeRef.current.dispatch(initializeSavedPosts(savedPostIds))
      }
    }
  }

  // Force ready state after 3 seconds to prevent infinite loading (reduced from 5)
  useEffect(() => {
    const forceReadyTimeout = setTimeout(() => {
      if (!isReady) {
        console.warn('[StoreProvider] Forcing ready state after timeout')
        setIsReady(true)
      }
    }, 3000)

    return () => clearTimeout(forceReadyTimeout)
  }, [isReady])

  // Optimized event listeners with immediate updates
  useEffect(() => {
    const handleUserLogin = (event: CustomEvent) => {
      if (event.detail && storeRef.current) {
        // Immediate state update
        storeRef.current.dispatch(setUser(event.detail))
        
        // Initialize post interactions for the logged-in user
        if (event.detail.id) {
          const likedPostIds = Array.isArray(event.detail.likedPosts) ? event.detail.likedPosts : []
          const savedPostIds = Array.isArray(event.detail.savedPosts) ? event.detail.savedPosts : []
          
          storeRef.current.dispatch(initializeLikedPosts(likedPostIds))
          storeRef.current.dispatch(initializeSavedPosts(savedPostIds))
        }
      }
    }

    const handleUserLogout = () => {
      if (storeRef.current) {
        storeRef.current.dispatch(setUser(null))
      }
    }

    // Use passive listeners for better performance
    window.addEventListener('user-login', handleUserLogin as EventListener, { passive: true })
    window.addEventListener('user-updated', handleUserLogin as EventListener, { passive: true })
    window.addEventListener('logout-success', handleUserLogout, { passive: true })

    return () => {
      window.removeEventListener('user-login', handleUserLogin as EventListener)
      window.removeEventListener('user-updated', handleUserLogin as EventListener)
      window.removeEventListener('logout-success', handleUserLogout)
    }
  }, [])

  // Skip loading for public routes to improve UX
  if (shouldSkipLoading) {
    return (
      <Provider store={storeRef.current}>
        {children}
      </Provider>
    )
  }

  return (
    <Provider store={storeRef.current}>
      <PersistGate 
        loading={<MinimalLoading />} 
        persistor={persistorRef.current}
        onBeforeLift={() => {
          // Additional setup before lifting the gate
          setIsReady(true)
        }}
      >
        {children}
      </PersistGate>
    </Provider>
  )
} 