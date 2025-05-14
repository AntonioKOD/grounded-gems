"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getSuggestedUsers,
  followUser,
  unfollowUser,
  getFeedPostsByUser,
  getFollowing,
  getFollowers,
} from "@/app/actions"
import { toast } from "sonner"
import type { User } from "@/types/feed"

export default function FeedSidebar() {
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({})
  const [processingUsers, setProcessingUsers] = useState<Record<string, boolean>>({})
  const [currentUser, setCurrentUser] = useState<{ id: string | number } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [posts, setPosts] = useState<any[]>([])
  const [following, setFollowing] = useState<User[]>([])
  const [followers, setFollowers] = useState<User[]>([])
  const [isActivityLoading, setIsActivityLoading] = useState(true)

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
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
          console.error("Failed to fetch current user:", response.status)
          return null
        }

        const data = await response.json()
        return data.user
      } catch (error) {
        console.error("Error fetching current user:", error)
        return null
      }
    }

    fetchCurrentUser().then((user) => {
      setCurrentUser(user as { id: string | number })
    })
  }, [])

  // Load suggested users when current user is available
  useEffect(() => {
    if (currentUser) {
      loadSuggestedUsers()
    }
  }, [currentUser])

  // Load activity data when current user is available
  useEffect(() => {
    if (!currentUser) return

    const loadActivityData = async () => {
      setIsActivityLoading(true)
      try {
        // Fetch all data in parallel
        const [postsData, followingData, followersData] = await Promise.all([
          getFeedPostsByUser(currentUser.id as string),
          getFollowing(currentUser.id as string),
          getFollowers(currentUser.id as string),
        ])

        setPosts(postsData || [])
        setFollowing(followingData || [])
        setFollowers(followersData || [])
      } catch (error) {
        console.error("Error fetching activity data:", error)
        toast.error("Failed to load activity data")
      } finally {
        setIsActivityLoading(false)
      }
    }

    loadActivityData()
  }, [currentUser])

  const loadSuggestedUsers = async () => {
    setIsLoading(true)
    try {
      // Pass the current user ID to filter out users that are already being followed
      const users = await getSuggestedUsers(currentUser?.id as string)

      // Map users to ensure consistent format
      const formattedUsers = users.map((user) => ({
        id: String(user.id), // Ensure id is a string
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        followerCount: user.followerCount,
        followingCount: user.followingCount,
        isFollowing: user.isFollowing,
      }))

      setSuggestedUsers(formattedUsers)

      // Initialize following states
      const states: Record<string, boolean> = {}
      formattedUsers.forEach((user) => {
        states[user.id] = user.isFollowing || false
      })
      setFollowingStates(states)
    } catch (error) {
      console.error("Error loading suggested users:", error)
      toast.error("Failed to load suggested users")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollowToggle = async (userId: string) => {
    // Prevent multiple clicks
    if (processingUsers[userId] || !currentUser) return

    setProcessingUsers((prev) => ({ ...prev, [userId]: true }))

    try {
      const isCurrentlyFollowing = followingStates[userId]

      if (isCurrentlyFollowing) {
        await unfollowUser(userId, currentUser.id as string)
        toast.success("Unfollowed successfully")

        // If we're unfollowing, add the user back to suggestions if they were removed
        if (!suggestedUsers.some((user) => user.id === userId)) {
          const user = suggestedUsers.find((u) => u.id === userId) || {
            id: userId,
            name: "User",
            followerCount: 0,
            isFollowing: false,
          }
          setSuggestedUsers((prev) => [...prev, user])
        }

        // Update following count
        setFollowing((prev) => prev.filter((user) => user.id !== userId))
      } else {
        await followUser(userId, currentUser.id as string)
        toast.success("Following successfully")

        // Remove the user from suggestions when followed
        setSuggestedUsers((prev) => prev.filter((user) => user.id !== userId))

        // Update following count - find the user in suggestedUsers and add to following
        const followedUser = suggestedUsers.find((user) => user.id === userId)
        if (followedUser) {
          setFollowing((prev) => [...prev, followedUser])
        }
      }

      // Update following state
      setFollowingStates((prev) => ({
        ...prev,
        [userId]: !isCurrentlyFollowing,
      }))

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
      toast.error("Failed to update follow status")
    } finally {
      setProcessingUsers((prev) => ({ ...prev, [userId]: false }))
    }
  }

  // Function to refresh suggested users
  const refreshSuggestedUsers = async () => {
    if (!currentUser) return

    setIsLoading(true)
    try {
      await loadSuggestedUsers()
      toast.success("Suggestions refreshed")
    } catch (error) {
      console.error("Error refreshing suggested users:", error)
      toast.error("Failed to refresh suggestions")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 sticky top-20">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Suggested to Follow</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshSuggestedUsers}
            disabled={isLoading || !currentUser}
            className="h-8 w-8 p-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isLoading ? "animate-spin" : ""}
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span className="sr-only">Refresh suggestions</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-9 w-20" />
              </div>
            ))
          ) : suggestedUsers.length > 0 ? (
            suggestedUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <Link href={`/profile/${user.id}`} className="flex items-center gap-3">
                  <Avatar>
                    {user.avatar ? (
                      <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                    ) : (
                      <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B]">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.followerCount} followers</p>
                  </div>
                </Link>
                <Button
                  variant={followingStates[user.id] ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleFollowToggle(user.id)}
                  disabled={processingUsers[user.id] || !currentUser}
                  className={
                    followingStates[user.id]
                      ? "border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                      : "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
                  }
                >
                  {processingUsers[user.id] ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : followingStates[user.id] ? (
                    "Following"
                  ) : (
                    "Follow"
                  )}
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">
                {currentUser
                  ? "No new suggestions available. You might be following all suggested users."
                  : "Sign in to see personalized suggestions."}
              </p>
              {currentUser && (
                <Button
                  variant="link"
                  onClick={refreshSuggestedUsers}
                  className="mt-2 text-[#FF6B6B]"
                  disabled={isLoading}
                >
                  Refresh suggestions
                </Button>
              )}
            </div>
          )}

          <div className="pt-2">
            <Link href="/discover" className="text-sm text-[#FF6B6B] hover:underline">
              Discover more people
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Your Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isActivityLoading || !currentUser ? (
            // Loading state for activity section
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Posts</span>
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Following</span>
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Followers</span>
                <Skeleton className="h-5 w-8" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Posts</span>
                <span className="font-medium">{posts.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Following</span>
                <span className="font-medium">{following.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Followers</span>
                <span className="font-medium">{followers.length}</span>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t">
            {currentUser ? (
              <Link href={`/profile/${currentUser.id}`} className="text-sm text-[#FF6B6B] hover:underline">
                View your profile
              </Link>
            ) : (
              <Link href="/login" className="text-sm text-[#FF6B6B] hover:underline">
                Log in to view your profile
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
