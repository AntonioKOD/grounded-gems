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

  // Prefetch login page for faster redirects
  useEffect(() => {
    router.prefetch('/login')
  }, [router])

  useEffect(() => {
    // Mark auth as checked when loading is complete
    if (!isLoading) {
      setAuthChecked(true)
    }
  }, [isLoading])

  useEffect(() => {
    // Immediate redirect for unauthenticated users
    if (!isLoading && authChecked && !isAuthenticated && !redirectAttempted && pathname !== '/login') {
      console.log("Protected route: User not authenticated, redirecting immediately to login from:", pathname)
      setRedirectAttempted(true)

      // Immediate redirect - no timeout needed
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [isAuthenticated, isLoading, authChecked, router, pathname, redirectAttempted])

  // Minimal loading state while checking authentication
  if (isLoading || !authChecked) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-1">
          <Loader2 className="h-6 w-6 animate-spin text-[#FF6B6B]" />
          <p className="text-xs text-gray-500">Checking access...</p>
        </div>
      </div>
    )
  }

  // If not authenticated and we've attempted redirect, show minimal loading
  if (!isAuthenticated && redirectAttempted) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-1">
          <Loader2 className="h-6 w-6 animate-spin text-[#FF6B6B]" />
          <p className="text-xs text-gray-500">Redirecting...</p>
        </div>
      </div>
    )
  }

  // If not authenticated but haven't redirected yet, show loading
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-1">
          <Loader2 className="h-6 w-6 animate-spin text-[#FF6B6B]" />
          <p className="text-xs text-gray-500">Checking access...</p>
        </div>
      </div>
    )
  }

  // User is authenticated, render children
  return <>{children}</>
}
