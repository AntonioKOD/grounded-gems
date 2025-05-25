'use client'
import { useRef, useEffect } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { persistStore } from 'redux-persist'
import { makeStore, AppStore } from '../lib/store'
import { setUser } from '../lib/features/user/userSlice'
import { initializeLikedPosts, initializeSavedPosts } from '../lib/features/posts/postsSlice'
import type { UserData } from '../lib/features/user/userSlice'
import { LoadingSpinner } from '../components/ui/loading-spinner'

interface StoreProviderProps {
  children: React.ReactNode
  initialUser?: UserData | null
}

export default function StoreProvider({ children, initialUser }: StoreProviderProps) {
  const storeRef = useRef<AppStore | null>(null)
  const persistorRef = useRef<any>(null)
  
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore()
    persistorRef.current = persistStore(storeRef.current)
    
    // Initialize the store with any initial data
    if (initialUser) {
      storeRef.current.dispatch(setUser(initialUser))
      
      // Initialize user's liked and saved posts if available
      if (initialUser.id) {
        const likedPostIds = Array.isArray(initialUser.likedPosts) ? initialUser.likedPosts : []
        const savedPostIds = Array.isArray(initialUser.savedPosts) ? initialUser.savedPosts : []
        
        console.log('StoreProvider: Initializing with user posts:', { 
          likedCount: likedPostIds.length, 
          savedCount: savedPostIds.length 
        })
        
        storeRef.current.dispatch(initializeLikedPosts(likedPostIds))
        storeRef.current.dispatch(initializeSavedPosts(savedPostIds))
      }
    }
  }

  // Listen for user login events to update the store
  useEffect(() => {
    const handleUserLogin = (event: CustomEvent) => {
      if (event.detail && storeRef.current) {
        storeRef.current.dispatch(setUser(event.detail))
        
        // Initialize post interactions for the logged-in user
        if (event.detail.id) {
          const likedPostIds = Array.isArray(event.detail.likedPosts) ? event.detail.likedPosts : []
          const savedPostIds = Array.isArray(event.detail.savedPosts) ? event.detail.savedPosts : []
          
          console.log('StoreProvider: User login - initializing posts:', { 
            likedCount: likedPostIds.length, 
            savedCount: savedPostIds.length 
          })
          
          storeRef.current.dispatch(initializeLikedPosts(likedPostIds))
          storeRef.current.dispatch(initializeSavedPosts(savedPostIds))
        }
      }
    }

    const handleUserLogout = () => {
      if (storeRef.current) {
        storeRef.current.dispatch(setUser(null))
        // Clear post interactions will be handled by the user slice
      }
    }

    window.addEventListener('user-login', handleUserLogin as EventListener)
    window.addEventListener('user-updated', handleUserLogin as EventListener)
    window.addEventListener('logout-success', handleUserLogout)

    return () => {
      window.removeEventListener('user-login', handleUserLogin as EventListener)
      window.removeEventListener('user-updated', handleUserLogin as EventListener)
      window.removeEventListener('logout-success', handleUserLogout)
    }
  }, [])

  return (
    <Provider store={storeRef.current}>
      <PersistGate loading={<LoadingSpinner />} persistor={persistorRef.current}>
        {children}
      </PersistGate>
    </Provider>
  )
} 