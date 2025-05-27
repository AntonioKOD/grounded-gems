"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Loader2 } from "lucide-react"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [redirectAttempted, setRedirectAttempted] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    // Mark auth as checked when loading is complete
    if (!isLoading) {
      setAuthChecked(true)
    }
  }, [isLoading])

  useEffect(() => {
    // Only redirect if:
    // 1. We're not currently loading
    // 2. Auth has been checked
    // 3. The user is not authenticated
    // 4. We haven't already attempted a redirect
    // 5. We're not already on the login page
    if (!isLoading && authChecked && !isAuthenticated && !redirectAttempted && pathname !== '/login') {
      console.log("Protected route: User not authenticated, redirecting to login from:", pathname)
      setRedirectAttempted(true)

      // Use a longer timeout to prevent conflicts with other redirects
      setTimeout(() => {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
      }, 150)
    }
  }, [isAuthenticated, isLoading, authChecked, router, pathname, redirectAttempted])

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

  // If not authenticated and we've attempted redirect, show loading state
  if (!isAuthenticated && redirectAttempted) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-gray-400">Redirecting to login...</div>
      </div>
    )
  }

  // If not authenticated but haven't redirected yet, show loading
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B6B]" />
          <p className="text-sm text-gray-500">Checking access...</p>
        </div>
      </div>
    )
  }

  // User is authenticated, render children
  return <>{children}</>
}
