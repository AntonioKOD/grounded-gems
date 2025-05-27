"use client"

import { createContext, useContext, useEffect, useRef, type PropsWithChildren } from "react"
import { useRouter } from "next/navigation"

interface CookieSyncContextType {
  checkAuth: () => Promise<boolean>
}

const CookieSyncContext = createContext<CookieSyncContextType | undefined>(undefined)

/**
 * Provider component that handles cookie synchronization across tabs
 */
export function CookieSyncProvider({ children }: PropsWithChildren) {
  const router = useRouter()
  const authCheckInterval = useRef<NodeJS.Timeout | null>(null)
  const lastAuthStatus = useRef<boolean | null>(null)

  // Function to check authentication status via a header response
  const checkAuth = async (): Promise<boolean> => {
    try {
      // Make a lightweight request to an endpoint that returns auth status
      const response = await fetch("/api/auth-check", {
        method: "GET",
        credentials: "include", // Important to include cookies
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          "X-Auth-Check": "1", // Custom header to identify this is an auth check
        },
      })

      // Check if we got a 401 (unauthenticated)
      if (response.status === 401) {
        return false
      }

      // Check the auth status header
      const authHeader = response.headers.get("x-auth-status")
      return authHeader === "authenticated"
    } catch (error) {
      console.error("Error checking auth status:", error)
      // Don't assume auth failed on network errors
      return lastAuthStatus.current ?? false
    }
  }

  // Set up BroadcastChannel for cross-tab communication
  useEffect(() => {
    let authChannel: BroadcastChannel | null = null

    // Only use BroadcastChannel if it's supported by the browser
    if (typeof BroadcastChannel !== "undefined") {
      authChannel = new BroadcastChannel("auth_status")

      // Listen for auth status changes from other tabs
      authChannel.onmessage = (event) => {
        if (event.data?.type === "AUTH_CHANGED") {
          const isAuthenticated = event.data.isAuthenticated

          // If auth status changed to not authenticated, reload the page
          // This forces the middleware to run and redirect if needed
          if (lastAuthStatus.current === true && isAuthenticated === false) {
            window.location.reload()
          }

          lastAuthStatus.current = isAuthenticated
        }
      }
    }

    // Initial auth check
    checkAuth().then((isAuthenticated) => {
      lastAuthStatus.current = isAuthenticated
    })

    // Set up interval to periodically check auth status
    authCheckInterval.current = setInterval(async () => {
      const isAuthenticated = await checkAuth()

      // If auth status changed, broadcast to other tabs
      if (lastAuthStatus.current !== null && lastAuthStatus.current !== isAuthenticated) {
        if (authChannel) {
          authChannel.postMessage({
            type: "AUTH_CHANGED",
            isAuthenticated,
          })
        }

        // If changed to not authenticated, reload to trigger middleware
        if (lastAuthStatus.current === true && isAuthenticated === false) {
          window.location.reload()
        }
      }

      lastAuthStatus.current = isAuthenticated
    }, 30000) // Check every 30 seconds instead of 10

    // Set up event listeners for tab visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // When tab becomes visible, check auth immediately
        checkAuth().then((isAuthenticated) => {
          // If auth status changed while tab was hidden, handle it
          if (lastAuthStatus.current !== null && lastAuthStatus.current !== isAuthenticated) {
            if (lastAuthStatus.current === true && isAuthenticated === false) {
              window.location.reload()
            }

            if (authChannel) {
              authChannel.postMessage({
                type: "AUTH_CHANGED",
                isAuthenticated,
              })
            }
          }

          lastAuthStatus.current = isAuthenticated
        })
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Cleanup function
    return () => {
      if (authCheckInterval.current) {
        clearInterval(authCheckInterval.current)
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange)

      if (authChannel) {
        authChannel.close()
      }
    }
  }, [router])

  return <CookieSyncContext.Provider value={{ checkAuth }}>{children}</CookieSyncContext.Provider>
}

/**
 * Hook to access the cookie sync context
 */
export function useCookieSync() {
  const context = useContext(CookieSyncContext)
  if (context === undefined) {
    throw new Error("useCookieSync must be used within a CookieSyncProvider")
  }
  return context
}
