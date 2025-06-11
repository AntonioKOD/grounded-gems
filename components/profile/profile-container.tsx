/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import ProfileHeader from "@/components/profile/profile-header"
import ProfileContent from "@/components/profile/profile-content"
import ProfileSkeleton from "@/components/profile/profile-skeleton"
import { getUserbyId, getFollowers, getFollowing } from "@/app/actions"
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
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [isFollowing, setIsFollowing] = useState(false)

  // Rate limiting and caching
  const lastFetchTime = useRef<number>(0)
  const fetchCache = useRef<Map<string, { data: any; timestamp: number }>>(new Map())
  const hasInitialized = useRef<boolean>(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Rate-limited API call helper
  const rateLimitedApiCall = useCallback(async (
    key: string, 
    apiCall: () => Promise<any>, 
    minInterval: number = 3000
  ) => {
    const now = Date.now()
    const cached = fetchCache.current.get(key)
    
    // Return cached data if it's fresh (less than 60 seconds old)
    if (cached && (now - cached.timestamp) < 60000) {
      console.log(`Using cached data for ${key}`)
      return cached.data
    }

    // Rate limit: prevent calls more frequent than minInterval
    if ((now - lastFetchTime.current) < minInterval) {
      console.log(`Rate limiting API call for ${key}, waiting...`)
      return cached?.data || null
    }

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
      
      console.error(`Rate-limited API call failed for ${key}:`, error)
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
            2000
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
            () => getUserbyId(userId),
            3000
          )

          if (profileData) {
            console.log("Profile data fetched:", profileData.id)
            setProfileUser(profileData)
            setIsCurrentUser(false)

            // 4. Fetch followers and following with delay
            setTimeout(async () => {
              try {
                console.log(`Fetching follow data for user ID: ${profileData.id}`)
                
                const [fetchedFollowers, fetchedFollowing] = await Promise.all([
                  rateLimitedApiCall(
                    `followers-${profileData.id}`,
                    () => getFollowers(profileData.id as string),
                    4000
                  ),
                  rateLimitedApiCall(
                    `following-${profileData.id}`,
                    () => getFollowing(profileData.id as string),
                    4000
                  )
                ])

                if (fetchedFollowers) {
                  setFollowers(fetchedFollowers || [])
                  console.log(`Fetched ${fetchedFollowers?.length || 0} followers`)
                }

                if (fetchedFollowing) {
                  setFollowing(fetchedFollowing || [])
                  console.log(`Fetched ${fetchedFollowing?.length || 0} following`)
                }

                // Check if current user is following this profile
                if (currentUserData && fetchedFollowers) {
                  const isCurrentUserFollowing = fetchedFollowers.some(
                    (follower: any) => follower.id === currentUserData.id,
                  )
                  setIsFollowing(isCurrentUserFollowing)
                  console.log(`Current user is ${isCurrentUserFollowing ? "" : "not "}following this profile`)
                }
              } catch (error) {
                console.error("Error fetching followers/following:", error)
                // Don't set error state for follow data failures
              }
            }, 1000) // 1 second delay

          } else {
            setError("User not found")
            console.log("User not found from getUserById")
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
    <>
      <ProfileHeader
        profileUser={profileUser}
        currentUser={currentUser}
        isCurrentUser={isCurrentUser}
        isFollowing={isFollowing}
        setIsFollowing={setIsFollowing}
        followers={followers}
        setFollowers={setFollowers}
      />
      <ProfileContent initialUserData={profileUser} userId={userId} />
    </>
  )
}
