'use client'
import { useRef, useEffect } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { persistStore } from 'redux-persist'
import { makeStore, AppStore } from '../lib/store'
import { setUser } from '../lib/features/user/userSlice'
import { initializeLikedPosts, initializeSavedPosts } from '../lib/features/posts/postsSlice'
import type { UserData } from '../lib/features/user/userSlice'

interface StoreProviderProps {
  children: React.ReactNode
  initialUser?: UserData | null
}

// Minimal loading component for faster rendering
function MinimalLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF6B6B]"></div>
    </div>
  )
}

export default function StoreProvider({ children, initialUser }: StoreProviderProps) {
  const storeRef = useRef<AppStore | null>(null)
  const persistorRef = useRef<any>(null)
  
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore()
    persistorRef.current = persistStore(storeRef.current)
    
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

  return (
    <Provider store={storeRef.current}>
      <PersistGate loading={<MinimalLoading />} persistor={persistorRef.current}>
        {children}
      </PersistGate>
    </Provider>
  )
} 