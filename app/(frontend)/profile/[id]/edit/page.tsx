/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Suspense } from 'react'

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ProfileEditForm } from "@/components/profile/profile-edit-form"
import { Skeleton } from "@/components/ui/skeleton"

// Prevent static generation
export const dynamic = 'force-dynamic'

export default function ProfileEditPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/users/me", {
          credentials: "include",
        })

        if (!response.ok) {
          // Check if we're already on the login page to prevent loops
          if (typeof window !== 'undefined' && window.location.pathname === '/login') {
            setError("You must be logged in to edit your profile")
            return
          }
          
          // Redirect to login with current page as redirect target
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
          router.push(`/login?redirect=${encodeURIComponent(currentPath)}`)
          return
        }

        const data = await response.json()
        setUser(data.user)
      } catch (error) {
        console.error("Error fetching user:", error)
        setError(error instanceof Error ? error.message : "Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCurrentUser()
  }, [])

  if (error) {
    return (
      <div className="container max-w-4xl py-10">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => router.push("/login")}>Go to Login</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Edit Profile</h1>
        </div>
      </div>

      <Separator className="mb-8" />

      {isLoading ? (
        <div className="space-y-8">
          <div className="flex justify-center">
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ) : user ? (
        <ProfileEditForm user={user} />
      ) : null}
    </div>
  )
}
