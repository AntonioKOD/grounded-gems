"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { logoutUser } from "@/lib/auth"
import { MobileAuthService, type StoredUserData } from "@/lib/mobile-auth"
import { Capacitor } from '@capacitor/core'

export interface UserData {
  id: string
  email: string
  name?: string
  avatar?: string
  profileImage?: {
    url: string
    alt?: string
  }
  location?: {
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  role?: string
}

interface UserContextType {
  user: UserData | null
  isLoading: boolean
  isAuthenticated: boolean
  refetchUser: () => Promise<void>
  logout: () => Promise<void>
  preloadUser: (userData: UserData) => void
  updateUser: (userData: Partial<UserData>) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({
  children,
  initialUser,
}: {
  children: ReactNode
  initialUser: UserData | null
}) {
  const [user, setUser] = useState<UserData | null>(initialUser)
  const [isLoading, setIsLoading] = useState(!initialUser)
  const [isInitialized, setIsInitialized] = useState(!!initialUser)
  const [fetchAttempted, setFetchAttempted] = useState(false)
  const router = useRouter()

  // Fetch user data from API with improved error handling and caching
  const fetchUser = useCallback(
    async (options?: { force?: boolean; silent?: boolean }) => {
      // If we already have user data and we're not forcing a refresh, don't fetch again
      if (user && !options?.force && isInitialized) {
        return
      }

      // If we already have initial user data from SSR and we're not forcing a refresh,
      // just mark as initialized and return
      if (initialUser && !options?.force && !isInitialized) {
        setUser(initialUser)
        setIsLoading(false)
        setIsInitialized(true)
        return
      }

      // Don't show loading state for silent fetches
      if (!options?.silent) {
        setIsLoading(true)
      }
      
      try {
        console.log("Fetching user data...")
        setFetchAttempted(true)
        
        // Use AbortController for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000) // Increased to 8 seconds
        
        const response = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache", // Always get fresh data
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          if (response.status === 401) {
            console.log("User not authenticated (401)")
            setUser(null)
            setIsInitialized(true)
            return
          }
          throw new Error(`Failed to fetch user: ${response.status}`)
        }

        const data = await response.json()
        console.log("User data fetched successfully:", data.user ? "User found" : "No user")
        setUser(data.user)
        setIsInitialized(true)

        // Dispatch custom event for other components to listen to
        if (data.user) {
          window.dispatchEvent(new CustomEvent("user-updated", { detail: data.user }))
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log("User fetch timed out")
        } else {
          console.error("Error fetching user:", error)
        }
        // Only set user to null on explicit 401 responses to prevent logout on network errors
        if (!user && !initialUser) {
          setUser(null)
        }
        setIsInitialized(true)
      } finally {
        setIsLoading(false)
      }
    },
    [initialUser, user, isInitialized],
  )

  // Enhanced initial fetch with mobile auth restoration
  useEffect(() => {
    const initializeUser = async () => {
      // For mobile platforms, try to restore user session first
      if (Capacitor.isNativePlatform() && !fetchAttempted) {
        try {
          const { userData, shouldAutoLogin } = await MobileAuthService.restoreUserSession()
          
          if (shouldAutoLogin && userData) {
            console.log("Restoring user session from mobile storage")
            setUser(userData as UserData)
            setIsLoading(false)
            setIsInitialized(true)
            setFetchAttempted(true)
            
            // Dispatch events for other components
            window.dispatchEvent(new CustomEvent("user-updated", { detail: userData }))
            
            // Verify session with server in background
            setTimeout(() => {
              fetchUser({ force: true, silent: true })
            }, 1000)
            
            return
          }
        } catch (error) {
          console.error("Failed to restore mobile session:", error)
        }
      }
      
      // Always try to fetch user data on mount, even if we have initial user
      if (!fetchAttempted) {
        // Fetch immediately without delay
        fetchUser({ force: true })
      }
    }
    
    initializeUser()
  }, [fetchUser, fetchAttempted])

  // Also try to fetch user data when the page becomes visible (user switches tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isInitialized) {
        // Try to fetch user data when page becomes visible
        fetchUser({ silent: true, force: true })
      }
    }

    const handleFocus = () => {
      if (isInitialized) {
        fetchUser({ silent: true, force: true })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchUser, isInitialized])

  // Preload user function for instant updates after login
  const preloadUser = useCallback(async (userData: UserData) => {
    console.log("Preloading user data:", userData)
    setUser(userData)
    setIsLoading(false)
    setIsInitialized(true)
    setFetchAttempted(true)
    
    // Save to mobile storage if on native platform
    if (Capacitor.isNativePlatform()) {
      try {
        await MobileAuthService.saveUserData(userData as StoredUserData)
        await MobileAuthService.saveRememberMe(true)
        console.log("User data saved to mobile storage")
      } catch (error) {
        console.error("Failed to save user data to mobile storage:", error)
      }
    }
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent("user-updated", { detail: userData }))
    window.dispatchEvent(new CustomEvent("user-login", { detail: userData }))
    
    // Force a re-fetch after a short delay to ensure we have the latest data
    setTimeout(() => {
      fetchUser({ force: true, silent: true })
    }, 500)
  }, [fetchUser])

  // Update user function for partial updates
  const updateUser = useCallback((userData: Partial<UserData>) => {
    setUser(prevUser => {
      if (!prevUser) return null
      const updatedUser = { ...prevUser, ...userData }
      
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent("user-updated", { detail: updatedUser }))
      
      return updatedUser
    })
  }, [])

  // Logout function
  const logout = useCallback(async () => {
    try {
      setIsLoading(true)
      const success = await logoutUser()

      if (success) {
        // Clear mobile storage if on native platform
        if (Capacitor.isNativePlatform()) {
          try {
            await MobileAuthService.clearAuthData()
            console.log("Mobile auth data cleared")
          } catch (error) {
            console.error("Failed to clear mobile auth data:", error)
          }
        }
        
        setUser(null)
        setIsInitialized(true)
        setFetchAttempted(false)
        // The logoutUser function already dispatches the event
        router.replace("/login")
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  // Listen for auth events with improved handling
  useEffect(() => {
    const handleLoginSuccess = (event?: CustomEvent) => {
      console.log("Login success event detected, preloading user data")
      
      // If we have user data in the event, use it immediately
      if (event?.detail) {
        preloadUser(event.detail)
      } else {
        // Force fetch user data immediately
        fetchUser({ force: true })
      }
    }
    
    const handleLogoutSuccess = () => {
      setUser(null)
      setIsInitialized(true)
      setFetchAttempted(false)
    }

    // Listen for both old and new event formats
    window.addEventListener("login-success", handleLoginSuccess as EventListener)
    window.addEventListener("logout-success", handleLogoutSuccess)
    window.addEventListener("user-login", handleLoginSuccess as EventListener)

    return () => {
      window.removeEventListener("login-success", handleLoginSuccess as EventListener)
      window.removeEventListener("logout-success", handleLogoutSuccess)
      window.removeEventListener("user-login", handleLoginSuccess as EventListener)
    }
  }, [fetchUser, preloadUser])

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        refetchUser: () => fetchUser({ force: true }),
        logout,
        preloadUser,
        updateUser,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
