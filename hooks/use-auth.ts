/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useUser } from "@/context/user-context"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useEffect, useState, useCallback, useRef } from "react"

export function useAuth(requireAuth = false) {
  const { user, isLoading, isAuthenticated, refetchUser, logout } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [redirectAttempted, setRedirectAttempted] = useState(false)
  const authCheckCompleted = useRef(false)
  const [cookieAvailable, setCookieAvailable] = useState(false)

  // Function to check if the auth cookie exists
  const checkAuthCookie = useCallback(() => {
    // Check if the auth cookie exists
    const hasCookie =
      document.cookie.includes("payload-token") || document.cookie.includes("grounded-gems-payload-token")
    setCookieAvailable(hasCookie)
    return hasCookie
  }, [])

  // Check for cookie on mount and when authentication state changes
  useEffect(() => {
    checkAuthCookie()

    // Set up an interval to check for the cookie until it's found
    // This helps with cases where the cookie might be set asynchronously
    if (!cookieAvailable && isAuthenticated) {
      const interval = setInterval(() => {
        if (checkAuthCookie()) {
          clearInterval(interval)
        }
      }, 100)

      // Clean up interval
      return () => clearInterval(interval)
    }
  }, [checkAuthCookie, cookieAvailable, isAuthenticated])

  // Function to handle redirection after login
  const handlePostLoginRedirect = useCallback(() => {
    if (isAuthenticated && !isLoading) {
      const redirectPath = searchParams.get("redirect")
      if (redirectPath) {
        // Handle encoded slashes - decode the path first
        const decodedPath = decodeURIComponent(redirectPath)
        console.log("Redirecting to:", decodedPath)
        router.replace(decodedPath)
      }
    }
  }, [isAuthenticated, isLoading, router, searchParams])

  // Handle client-side protection for routes that require authentication
  useEffect(() => {
    if (requireAuth && !isLoading && !isAuthenticated && !redirectAttempted) {
      setRedirectAttempted(true)

      // Get the current path for redirection after login
      const currentPath = window.location.pathname
      console.log("Protected route, redirecting to login. Current path:", currentPath)

      // Short delay to prevent immediate redirect which can cause issues
      setTimeout(() => {
        router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`)
      }, 100)
    }

    // Mark auth check as completed when loading is done
    if (!isLoading) {
      authCheckCompleted.current = true
    }
  }, [user, isLoading, isAuthenticated, requireAuth, router, redirectAttempted])

  // Handle redirect after successful login
  useEffect(() => {
    handlePostLoginRedirect()
  }, [handlePostLoginRedirect])

  // Function to manually trigger a redirect check
  const checkAndRedirect = useCallback(() => {
    handlePostLoginRedirect()
  }, [handlePostLoginRedirect])

  // Function to force a refetch of user data and ensure cookie is available
  const ensureAuthentication = useCallback(async () => {
    if (isAuthenticated && !cookieAvailable) {
      console.log("Authentication state exists but cookie not detected, refetching user data...")
      await refetchUser()
      checkAuthCookie()
    }
    return isAuthenticated && (cookieAvailable || checkAuthCookie())
  }, [isAuthenticated, cookieAvailable, refetchUser, checkAuthCookie])

  return {
    user,
    isLoading,
    isAuthenticated,
    refetchUser,
    logout,
    isAdmin: user?.role === "admin",
    checkAndRedirect,
    cookieAvailable,
    authCheckCompleted: authCheckCompleted.current,
    ensureAuthentication,
  }
}
