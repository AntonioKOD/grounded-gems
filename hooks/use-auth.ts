/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import { fetchUser, logoutUser as logoutUserAction, setUser, updateUser } from '@/lib/features/user/userSlice'
import { clearPostInteractions } from '@/lib/features/posts/postsSlice'
import { clearFeed } from '@/lib/features/feed/feedSlice'
import type { UserData } from '@/lib/features/user/userSlice'
import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

// Global state to track auth initialization across all components
const globalAuthState = {
  isInitializing: false,
  lastFetchTime: 0,
  fetchPromise: null as Promise<any> | null,
  initializedComponents: new Set<string>(),
  
  canFetch(): boolean {
    const now = Date.now()
    const timeSinceLastFetch = now - this.lastFetchTime
    const minInterval = 5000 // 5 seconds minimum between fetches
    
    return !this.isInitializing && timeSinceLastFetch > minInterval
  },
  
  startFetch(): Promise<any> {
    if (this.fetchPromise) {
      return this.fetchPromise
    }
    
    this.isInitializing = true
    this.lastFetchTime = Date.now()
    
    return Promise.resolve()
  },
  
  endFetch() {
    this.isInitializing = false
    this.fetchPromise = null
  }
}

// Circuit breaker to prevent infinite API calls
const circuitBreaker = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
  threshold: 3,
  timeout: 30000, // 30 seconds
  
  canExecute(): boolean {
    if (!this.isOpen) return true
    
    const now = Date.now()
    if (now - this.lastFailure > this.timeout) {
      this.isOpen = false
      this.failures = 0
      return true
    }
    
    return false
  },
  
  onSuccess() {
    this.failures = 0
    this.isOpen = false
  },
  
  onFailure() {
    this.failures++
    this.lastFailure = Date.now()
    
    if (this.failures >= this.threshold) {
      this.isOpen = true
      console.warn('Circuit breaker opened - too many auth failures')
    }
  }
}

export function useAuth(componentId?: string) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { user, isLoading, isAuthenticated, error } = useAppSelector((state) => state.user)
  const fetchAttempted = useRef(false)
  const componentKey = componentId || 'default'

  // Note: User fetching is now handled by the controlled effect below with circuit breaker

  // Controlled user fetch with circuit breaker and global coordination
  useEffect(() => {
    console.log('🔐 [useAuth] Auth state check:', { 
      user: !!user, 
      isLoading, 
      fetchAttempted: fetchAttempted.current,
      componentKey,
      canFetch: globalAuthState.canFetch(),
      circuitBreakerOpen: circuitBreaker.isOpen
    })
    
    // Skip if already fetched or if circuit breaker is open
    if (user || isLoading || fetchAttempted.current || !circuitBreaker.canExecute()) {
      return
    }
    
    // Check global coordination
    if (!globalAuthState.canFetch()) {
      console.log('🔐 [useAuth] Skipping fetch due to global coordination:', componentKey)
      return
    }
    
    // Mark this component as initialized
    globalAuthState.initializedComponents.add(componentKey)
    
    console.log('🔐 [useAuth] Attempting to fetch user from component:', componentKey)
    fetchAttempted.current = true
    
    // Use global coordination
    globalAuthState.startFetch()
    
    dispatch(fetchUser({}))
      .unwrap()
      .then(() => {
        console.log('🔐 [useAuth] User fetch successful from component:', componentKey)
        circuitBreaker.onSuccess()
        globalAuthState.endFetch()
      })
      .catch((error) => {
        console.error('🔐 [useAuth] Auth fetch failed from component:', componentKey, error)
        circuitBreaker.onFailure()
        globalAuthState.endFetch()
        
        // Reset attempt flag after a delay to allow retry
        setTimeout(() => {
          fetchAttempted.current = false
        }, 10000) // Increased to 10 seconds
      })
  }, [dispatch, user, isLoading, componentKey])

  const refetchUser = useCallback(async () => {
    if (!circuitBreaker.canExecute()) {
      console.warn('Circuit breaker is open - skipping user fetch')
      return
    }
    
    if (!globalAuthState.canFetch()) {
      console.warn('Global coordination prevents fetch - skipping user fetch')
      return
    }
    
    try {
      globalAuthState.startFetch()
      await dispatch(fetchUser({ force: true })).unwrap()
      circuitBreaker.onSuccess()
      globalAuthState.endFetch()
    } catch (error) {
      circuitBreaker.onFailure()
      globalAuthState.endFetch()
      throw error
    }
  }, [dispatch])

  const logout = useCallback(async () => {
    try {
      // Call backend logout API to clear session/cookie
      await fetch('/api/users/logout', { method: 'POST', credentials: 'include' })
      await dispatch(logoutUserAction()).unwrap()
      // Clear all related state
      dispatch(clearPostInteractions())
      dispatch(clearFeed())
      // Reset circuit breaker on logout
      circuitBreaker.failures = 0
      circuitBreaker.isOpen = false
      fetchAttempted.current = false
      // Reset global state
      globalAuthState.isInitializing = false
      globalAuthState.fetchPromise = null
      globalAuthState.initializedComponents.clear()
      // Dispatch logout event for other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('logout-success'))
      }
      // Redirect to login page using push instead of replace to prevent loops
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      throw error
    }
  }, [dispatch, router])

  const preloadUser = useCallback((userData: UserData) => {
    dispatch(setUser(userData))
    circuitBreaker.onSuccess()
    fetchAttempted.current = true
    globalAuthState.initializedComponents.add(componentKey)
  }, [dispatch, componentKey])

  const updateUserData = useCallback((userData: Partial<UserData>) => {
    dispatch(updateUser(userData))
  }, [dispatch])

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    refetchUser,
    logout,
    preloadUser,
    updateUser: updateUserData,
  }
}
