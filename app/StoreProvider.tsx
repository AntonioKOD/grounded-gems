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



export default function StoreProvider({ children, initialUser }: StoreProviderProps) {
  const storeRef = useRef<AppStore | null>(null)
  const persistorRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [shouldSkipPersistence, setShouldSkipPersistence] = useState(true) // Default to skip on server
  const pathname = usePathname()
  
  // Handle persistence logic after hydration to avoid SSR mismatch
  useEffect(() => {
    // Check if current route needs persistence after hydration
    const publicRoutes = [
      '/', 
      '/search', 
      '/map', 
      '/locations', 
      '/events',
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/verify',
      '/explorer',
      '/post',
      '/home-page-actions',
      '/test-feed'
    ]
    
    const isPublicRoute = publicRoutes.some(route => 
      pathname === route || pathname.startsWith(route + '/')
    )
    
    // Skip persistence for public routes
    setShouldSkipPersistence(isPublicRoute)
    
    // If we're skipping persistence, mark as ready immediately
    if (isPublicRoute) {
      setIsReady(true)
    }
  }, [pathname])
  
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

  // Force ready state after 1 second to prevent infinite loading
  useEffect(() => {
    const forceReadyTimeout = setTimeout(() => {
      if (!isReady) {
        console.warn('[StoreProvider] Forcing ready state after timeout')
        setIsReady(true)
      }
    }, 1000) // Reduced to 1 second

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

  // Always skip persistence for public routes to avoid hydration issues
  if (shouldSkipPersistence) {
    return (
      <Provider store={storeRef.current}>
        {children}
      </Provider>
    )
  }

  // For routes that need persistence, still render children immediately
  // but initialize the persistor in the background
  return (
    <Provider store={storeRef.current}>
      <PersistGate 
        loading={null} 
        persistor={persistorRef.current}
      >
        {children}
      </PersistGate>
    </Provider>
  )
} 