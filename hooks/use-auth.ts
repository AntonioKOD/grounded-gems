/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import { fetchUser, logoutUser as logoutUserAction, setUser, updateUser } from '@/lib/features/user/userSlice'
import { clearPostInteractions } from '@/lib/features/posts/postsSlice'
import { clearFeed } from '@/lib/features/feed/feedSlice'
import type { UserData } from '@/lib/features/user/userSlice'
import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

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

export function useAuth() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { user, isLoading, isAuthenticated, error } = useAppSelector((state) => state.user)
  const fetchAttempted = useRef(false)

  // Note: User fetching is now handled by the controlled effect below with circuit breaker

  // Controlled user fetch with circuit breaker
  useEffect(() => {
    console.log('🔐 [useAuth] Auth state check:', { user: !!user, isLoading, fetchAttempted: fetchAttempted.current })
    
    if (!user && !isLoading && !fetchAttempted.current && circuitBreaker.canExecute()) {
      console.log('🔐 [useAuth] Attempting to fetch user')
      fetchAttempted.current = true
      
      dispatch(fetchUser())
        .unwrap()
        .then(() => {
          console.log('🔐 [useAuth] User fetch successful')
          circuitBreaker.onSuccess()
        })
        .catch((error) => {
          console.error('🔐 [useAuth] Auth fetch failed:', error)
          circuitBreaker.onFailure()
          
          // Reset attempt flag after a delay to allow retry
          setTimeout(() => {
            fetchAttempted.current = false
          }, 5000)
        })
    }
  }, [dispatch, user, isLoading])

  const refetchUser = useCallback(async () => {
    if (!circuitBreaker.canExecute()) {
      console.warn('Circuit breaker is open - skipping user fetch')
      return
    }
    
    try {
      await dispatch(fetchUser({ force: true })).unwrap()
      circuitBreaker.onSuccess()
    } catch (error) {
      circuitBreaker.onFailure()
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
  }, [dispatch])

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
