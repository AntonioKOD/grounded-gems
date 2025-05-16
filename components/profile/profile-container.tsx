/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import ProfileHeader from "@/components/profile/profile-header"
import ProfileContent from "@/components/profile/profile-content"
import ProfileSkeleton from "@/components/profile/profile-skeleton"
import { getUserbyId, getFollowers, getFollowing } from "@/app/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

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

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // 1. First fetch the current user to check if logged in
        let currentUserData = null
        try {
          console.log("Fetching current user from /api/users/me")
          const currentUserResponse = await fetch("/api/users/me", {
            method: "GET",
            credentials: "include",
          })

          if (currentUserResponse.ok) {
            const data = await currentUserResponse.json()
            currentUserData = data.user
            setCurrentUser(currentUserData)
            console.log("Current user fetched:", currentUserData)
          } else {
            console.log("Failed to fetch current user, status:", currentUserResponse.status)
          }
        } catch (error) {
          console.error("Error fetching current user:", error)
        }

        // 2. Determine which profile to show
        if (userId === "me") {
          // If URL is /profile/me, show current user's profile
          if (currentUserData) {
            console.log("Using current user data for 'me' route")
            setProfileUser(currentUserData)
            setIsCurrentUser(true)
          } else {
            // Not logged in but trying to access /profile/me
            setError("Please log in to view your profile")
            console.log("Not logged in but trying to access /profile/me")
          }
        } else if (currentUserData && userId === currentUserData.id) {
          // If URL is /profile/[current-user-id], still show current user's profile
          console.log("URL matches current user ID, using current user data")
          setProfileUser(currentUserData)
          setIsCurrentUser(true)
        } else {
          // Otherwise, fetch the specific user profile from the ID in the URL
          try {
            console.log(`Fetching profile for user ID: ${userId} from getUserById`)
            const profileData = await getUserbyId(userId)

            if (profileData) {
              console.log("Profile data fetched:", profileData)
              setProfileUser(profileData)
              setIsCurrentUser(false)

              // Fetch followers and following
              try {
                console.log(`Fetching followers for user ID: ${profileData.id}`)
                const fetchedFollowers = await getFollowers(profileData.id as string)
                setFollowers(fetchedFollowers || [])
                console.log(`Fetched ${fetchedFollowers?.length || 0} followers`)

                console.log(`Fetching following for user ID: ${profileData.id}`)
                const fetchedFollowing = await getFollowing(profileData.id as string)
                setFollowing(fetchedFollowing || [])
                console.log(`Fetched ${fetchedFollowing?.length || 0} following`)

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
              }
            } else {
              setError("User not found")
              console.log("User not found from getUserById")
            }
          } catch (error) {
            console.error("Error fetching profile user:", error)
            setError("Failed to load user profile")
          }
        }
      } catch (error) {
        console.error("Error in fetchUsers:", error)
        setError("Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [userId])

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
      <ProfileContent profileUser={profileUser} currentUser={currentUser} isCurrentUser={isCurrentUser} />
    </>
  )
}
