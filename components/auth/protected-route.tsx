"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Loader2 } from "lucide-react"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, refetchUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [redirectAttempted, setRedirectAttempted] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  // Force a refetch of user data when the component mounts
  useEffect(() => {
    // Only refetch if we're not already loading
    if (!isLoading) {
      refetchUser()
    }
  }, [refetchUser, isLoading])

  useEffect(() => {
    // Only redirect if:
    // 1. We're not currently loading
    // 2. The user is not authenticated
    // 3. We haven't already attempted a redirect
    if (!isLoading && !isAuthenticated && !redirectAttempted) {
      console.log("Protected route: User not authenticated, redirecting to login")
      setRedirectAttempted(true)

      // Use a timeout to prevent immediate redirect which can cause issues
      setTimeout(() => {
        router.replace(`/login?redirect=${pathname}`)
      }, 100)
    }

    // Mark auth as checked when loading is complete
    if (!isLoading) {
      setAuthChecked(true)
    }
  }, [isAuthenticated, isLoading, router, pathname, redirectAttempted])

  // Show loading state while checking authentication
  if (isLoading || !authChecked) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B6B]" />
          <p className="text-sm text-gray-500">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, show a minimal loading state
  // This prevents flashing content before redirect
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-gray-400">Redirecting to login...</div>
      </div>
    )
  }

  // User is authenticated, render children
  return <>{children}</>
}
