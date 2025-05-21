"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"

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
  const router = useRouter()

  // Fetch user data from API
  const fetchUser = useCallback(
    async (options?: { force?: boolean }) => {
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

      setIsLoading(true)
      try {
        console.log("Fetching user data...")
        const response = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        })

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
      } catch (error) {
        console.error("Error fetching user:", error)
        // Only set user to null on explicit 401 responses to prevent logout on network errors
      } finally {
        setIsLoading(false)
      }
    },
    [initialUser, user, isInitialized],
  )

  // Initial fetch - only if we don't have initialUser
  useEffect(() => {
    if (!isInitialized) {
      fetchUser()
    }
  }, [fetchUser, isInitialized])

  // Logout function
  const logout = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/users/logout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        setUser(null)
        window.dispatchEvent(new Event("logout-success"))
        router.replace("/login")
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  // Listen for auth events
  useEffect(() => {
    const handleLoginSuccess = () => {
      console.log("Login success event detected, fetching user data")
      fetchUser({ force: true })
    }
    const handleLogoutSuccess = () => setUser(null)

    window.addEventListener("login-success", handleLoginSuccess)
    window.addEventListener("logout-success", handleLogoutSuccess)

    return () => {
      window.removeEventListener("login-success", handleLoginSuccess)
      window.removeEventListener("logout-success", handleLogoutSuccess)
    }
  }, [fetchUser])

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        refetchUser: () => fetchUser({ force: true }),
        logout,
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
