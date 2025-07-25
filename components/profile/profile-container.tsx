
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"

import ProfileContent from "@/components/profile/profile-content"
import ProfileSkeleton from "@/components/profile/profile-skeleton"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface ProfileContainerProps {
  userId: string
}

export default function ProfileContainer({ userId }: ProfileContainerProps) {
  const router = useRouter()
  const [profileUser, setProfileUser] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isCurrentUser, setIsCurrentUser] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  // Rate limiting and caching
  const lastFetchTime = useRef<number>(0)
  const fetchCache = useRef<Map<string, { data: any; timestamp: number }>>(new Map())
  const hasInitialized = useRef<boolean>(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Rate-limited API call helper
  const rateLimitedApiCall = useCallback(async (
    key: string, 
    apiCall: () => Promise<any>, 
    minInterval: number = 500 // Reduced from 3000ms to 500ms for better UX
  ) => {
    const now = Date.now()
    const cached = fetchCache.current.get(key)
    
    // Return cached data if it's fresh (less than 60 seconds old)
    if (cached && (now - cached.timestamp) < 60000) {
      console.log(`Using cached data for ${key}`)
      return cached.data
    }

    // RATE LIMITING DISABLED - Always execute immediately
    try {
      // Abort any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      abortControllerRef.current = new AbortController()
      lastFetchTime.current = now
      
      const result = await apiCall()
      
      // Cache the result
      if (result) {
        fetchCache.current.set(key, { data: result, timestamp: now })
      }
      
      return result
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`Request aborted for ${key}`)
        return cached?.data || null
      }
      
      if (error.message?.includes('429')) {
        console.warn(`Rate limited for ${key}`)
        toast.error("Too many requests. Please wait a moment.")
        return cached?.data || null
      }
      
      console.error(`API call failed for ${key}:`, error)
      throw error
    }
  }, [])



  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current) {
      console.log('ProfileContainer already initialized, skipping')
      return
    }

    const fetchUsers = async () => {
      setIsLoading(true)
      setError(null)
      hasInitialized.current = true

      try {
        console.log('ProfileContainer: Starting data fetch')
        
        // 1. First fetch the current user to check if logged in
        let currentUserData = null
        try {
          console.log("Fetching current user from /api/users/me")
          
          const response = await rateLimitedApiCall(
            'current-user',
            async () => {
              const res = await fetch("/api/users/me", {
                method: "GET",
                credentials: "include",
              })
              if (res.ok) {
                const data = await res.json()
                return data.user
              }
              return null
            },
            500 // Reduced from 2000ms to 500ms
          )

          if (response) {
            currentUserData = response
            setCurrentUser(currentUserData)
            console.log("Current user fetched:", currentUserData?.id)
          } else {
            console.log("No current user found or failed to fetch")
          }
        } catch (error) {
          console.error("Error fetching current user:", error)
        }

        // 2. Check if viewing own profile
        if (currentUserData && currentUserData.id === userId) {
          console.log("User is viewing their own profile")
          setProfileUser(currentUserData)
          setIsCurrentUser(true)
          setIsLoading(false)
          return
        }

        // 3. Fetch the specific user profile from the ID in the URL
        try {
          console.log(`Fetching profile for user ID: ${userId}`)
          
          const profileData = await rateLimitedApiCall(
            `profile-${userId}`,
            async () => {
              const res = await fetch(`/api/users/${userId}/profile`, {
                method: "GET",
                credentials: "include",
              })
              if (res.ok) {
                const data = await res.json()
                return data.user
              }
              throw new Error(`Failed to fetch profile: ${res.status}`)
            },
            3000
          )

                  if (profileData) {
          console.log("Profile data fetched:", profileData.id)
          console.log("Profile data details:", {
            isFollowing: profileData.isFollowing,
            followers: profileData.followers,
            followerCount: profileData.followerCount
          })
          setProfileUser(profileData)
          setIsCurrentUser(false)



          } else {
            setError("User not found")
            console.log("User not found from getUserProfile")
          }
        } catch (error) {
          console.error("Error fetching profile user:", error)
          setError("Failed to load user profile")
        }
      } catch (error) {
        console.error("Error in fetchUsers:", error)
        setError("Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }

    // Add a small delay before starting to prevent rapid re-renders
    const timeoutId = setTimeout(fetchUsers, 300)
    
    return () => {
      clearTimeout(timeoutId)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [userId, rateLimitedApiCall]) // Only depend on userId

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      fetchCache.current.clear()
    }
  }, [])

  if (isLoading) {
    return <ProfileSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={() => router.push("/")} variant="outline">
            Return to Home
          </Button>
        </div>
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>User profile not found</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={() => router.push("/")} variant="outline">
            Return to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ProfileContent initialUserData={profileUser} userId={userId} />
  )
}
