
"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, LinkIcon, UserPlus, UserCheck } from "lucide-react"

import { toast } from "sonner"
import { getImageUrl } from "@/lib/image-utils"

interface ProfileHeaderProps {
  profileUser: any
  currentUser: any
  isCurrentUser: boolean
  isFollowing: boolean
  setIsFollowing: (value: boolean) => void
  followers: any[]
  setFollowers: (followers: any[] | ((prev: any[]) => any[])) => void
  setProfileUser?: (updater: (prev: any) => any) => void
}

export default function ProfileHeader({
  profileUser,
  currentUser,
  isCurrentUser,
  isFollowing,
  setIsFollowing,
  followers,
  setFollowers,
  setProfileUser,
}: ProfileHeaderProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState("posts")
  const lastFollowActionRef = useRef<number>(0)

  // Clear cache on unmount to ensure fresh data on next visit
  useEffect(() => {
    return () => {
      if (typeof globalThis !== 'undefined' && globalThis._followCache && profileUser?.id) {
        globalThis._followCache.delete(`followers-${profileUser.id}`)
        globalThis._followCache.delete(`following-${profileUser.id}`)
        if (currentUser && currentUser.id !== profileUser.id) {
          globalThis._followCache.delete(`followers-${currentUser.id}`)
          globalThis._followCache.delete(`following-${currentUser.id}`)
        }
        console.log('🗑️ Cleared follow cache on component unmount')
      }
    }
  }, [profileUser?.id, currentUser?.id])

  // Helper function to normalize user ID for comparison
  const normalizeId = (id: any): string => {
    if (typeof id === 'string') return id
    if (id && typeof id === 'object' && id.id) return String(id.id)
    return String(id)
  }

  // Helper function to check if current user is in followers list
  const isCurrentUserInFollowers = (): boolean => {
    if (!currentUser?.id || !Array.isArray(followers)) return false
    
    const currentUserId = normalizeId(currentUser.id)
    return followers.some((follower: any) => {
      const followerId = normalizeId(follower.id || follower)
      return followerId === currentUserId
    })
  }

  // Update following state based on followers list
  useEffect(() => {
    if (!isCurrentUser && currentUser?.id && Array.isArray(followers)) {
      const shouldBeFollowing = isCurrentUserInFollowers()
      if (isFollowing !== shouldBeFollowing && !isProcessing) {
        console.log(`🔄 Updating isFollowing state: ${isFollowing} -> ${shouldBeFollowing}`)
        setIsFollowing(shouldBeFollowing)
      }
    }
  }, [followers, currentUser?.id, isCurrentUser, isFollowing, isProcessing, setIsFollowing])

  // Function to refresh profile data from server
  const refreshProfileData = async () => {
    if (!profileUser?.id) return
    
    try {
      console.log('🔄 Refreshing profile data from server')
      
      // Clear the follow cache to ensure fresh data
      if (typeof globalThis !== 'undefined' && globalThis._followCache) {
        globalThis._followCache.delete(`followers-${profileUser.id}`)
        globalThis._followCache.delete(`following-${profileUser.id}`)
        if (currentUser && currentUser.id !== profileUser.id) {
          globalThis._followCache.delete(`followers-${currentUser.id}`)
          globalThis._followCache.delete(`following-${currentUser.id}`)
        }
        console.log('🗑️ Cleared follow cache for fresh data')
      }
      
      // Fetch profile data
      const response = await fetch(`/api/users/${profileUser.id}/profile`, {
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.user && setProfileUser) {
          setProfileUser(data.user)
          console.log('✅ Profile data refreshed successfully')
          
          // Also refresh followers list to update the UI immediately
          try {
            console.log('🔄 Refreshing followers list...')
            const followersResponse = await fetch(`/api/users/${profileUser.id}/followers`, {
              credentials: 'include',
            })
            
            if (followersResponse.ok) {
              const followersData = await followersResponse.json()
              if (followersData.success && Array.isArray(followersData.followers)) {
                setFollowers(followersData.followers)
                console.log(`✅ Followers list refreshed successfully: ${followersData.followers.length} followers`)
                
                // Update isFollowing state based on new followers list
                if (currentUser) {
                  const currentId = normalizeId(currentUser.id)
                  const isUserFollowing = followersData.followers.some((follower: any) => {
                    const followerId = normalizeId(follower.id || follower)
                    const matches = followerId === currentId
                    console.log(`Checking follower in refresh: ${followerId} vs current: ${currentId} = ${matches}`)
                    return matches
                  })
                  
                  if (isFollowing !== isUserFollowing) {
                    setIsFollowing(isUserFollowing)
                    console.log(`✅ Updated isFollowing state in refresh: ${isUserFollowing}`)
                  } else {
                    console.log(`ℹ️ isFollowing state unchanged in refresh: ${isUserFollowing}`)
                  }
                }
                

              } else {
                console.log('⚠️ Invalid followers data structure:', followersData)
              }
            } else {
              console.error('❌ Failed to refresh followers:', followersResponse.status)
            }
          } catch (followersError) {
            console.error('❌ Error refreshing followers:', followersError)
          }
        } else {
          console.error('❌ Invalid profile data structure:', data)
        }
      } else {
        console.error('❌ Failed to refresh profile data:', response.status)
      }
    } catch (error) {
      console.error('❌ Error refreshing profile data:', error)
    }
  }

  const handleFollowToggle = async () => {
    if (isProcessing || !currentUser) return

    // Prevent self-following
    if (profileUser.id === currentUser.id) {
      toast.error("You cannot follow yourself")
      return
    }

    // Rate limit follow actions to prevent spam
    const now = Date.now()
    const timeSinceLastAction = now - lastFollowActionRef.current
    if (timeSinceLastAction < 500) {
      toast.error("Please wait before performing another follow action")
      return
    }

    setIsProcessing(true)
    lastFollowActionRef.current = now

    try {
      console.log(`${isFollowing ? 'Unfollowing' : 'Following'} user:`, profileUser.id)
      
      if (isFollowing) {
        const response = await fetch('/api/users/follow', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ userId: profileUser.id }),
        })

        if (response.ok) {
          toast.success(`Unfollowed ${profileUser.name}`)
          setIsFollowing(false)
          
          // Immediately update followers list by removing current user
          if (currentUser) {
            setFollowers((prev: any[]) =>
              Array.isArray(prev) ? prev.filter(follower => {
                const followerId = normalizeId(follower.id || follower)
                const currentId = normalizeId(currentUser.id)
                return followerId !== currentId
              }) : []
            )
          }

          // Clear cache for both users to ensure fresh data
          if (typeof globalThis !== 'undefined' && globalThis._followCache) {
            globalThis._followCache.delete(`followers-${profileUser.id}`)
            globalThis._followCache.delete(`following-${profileUser.id}`)
            globalThis._followCache.delete(`followers-${currentUser.id}`)
            globalThis._followCache.delete(`following-${currentUser.id}`)
            console.log('🗑️ Cleared follow cache for both users after unfollow')
          }

          // Force refresh profile data after a delay to ensure server has recorded the action
          setTimeout(async () => {
            await refreshProfileData()
          }, 1000) // Wait 1 second before refreshing
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to unfollow')
        }
      } else {
        const response = await fetch('/api/users/follow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ userId: profileUser.id }),
        })

        if (response.ok) {
          toast.success(`Now following ${profileUser.name}`)
          setIsFollowing(true)
          
          // Immediately update followers list by adding current user
          if (currentUser) {
            const newFollower = {
              id: currentUser.id,
              name: currentUser.name,
              username: currentUser.username,
              email: currentUser.email,
              profileImage: currentUser.profileImage,
              bio: currentUser.bio,
              isVerified: currentUser.isVerified || false,
              followerCount: currentUser.followers?.length || 0
            }
            setFollowers((prev: any[]) => [newFollower, ...prev])
            console.log('✅ Immediately added current user to followers list:', newFollower)
          }
          
          // Clear cache for both users to ensure fresh data
          if (typeof globalThis !== 'undefined' && globalThis._followCache) {
            globalThis._followCache.delete(`followers-${profileUser.id}`)
            globalThis._followCache.delete(`following-${profileUser.id}`)
            globalThis._followCache.delete(`followers-${currentUser.id}`)
            globalThis._followCache.delete(`following-${currentUser.id}`)
            console.log('🗑️ Cleared follow cache for both users after follow')
          }
          
          // Force refresh profile data after a delay to ensure server has recorded the action
          setTimeout(async () => {
            await refreshProfileData()
          }, 1000) // Wait 1 second before refreshing
        } else {
          const errorData = await response.json()
          if (errorData.error === 'Already following this user') {
            // User is already following, update state to reflect this
            setIsFollowing(true)
            toast.info("You are already following this user")
            
            // Clear cache and refresh data to ensure consistency
            if (typeof globalThis !== 'undefined' && globalThis._followCache) {
              globalThis._followCache.delete(`followers-${profileUser.id}`)
              globalThis._followCache.delete(`following-${profileUser.id}`)
              globalThis._followCache.delete(`followers-${currentUser.id}`)
              globalThis._followCache.delete(`following-${currentUser.id}`)
            }
            // Force refresh profile data after a delay for "Already following" case
            setTimeout(async () => {
              await refreshProfileData()
            }, 1000) // Wait 1 second before refreshing
          } else {
            throw new Error(errorData.error || 'Failed to follow')
          }
        }
      }

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    } catch (error: any) {
      console.error("Error toggling follow:", error)
      
      // Handle specific error types
      if (error.message === 'Users cannot follow themselves') {
        toast.error("You cannot follow yourself")
      } else if (error.message?.includes('429')) {
        toast.error("Too many requests. Please wait a moment before trying again.")
      } else if (error.message?.includes('Rate limit')) {
        toast.error("Please wait before performing another action")
      } else {
        toast.error("Failed to update follow status")
      }
    } finally {
      // Add delay before re-enabling button
      setTimeout(() => {
        setIsProcessing(false)
      }, 300)
    }
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Get profile image URL using proper image utility
  const getProfileImageUrl = () => {
    if (!profileUser?.profileImage?.url) return "/placeholder.svg"
    const imageUrl = getImageUrl(profileUser.profileImage.url)
    return imageUrl !== "/placeholder.svg" ? imageUrl : "/placeholder.svg"
  }

  return (
    <div className="space-y-6">
      {/* Cover image */}
      <div className="relative h-48 w-full rounded-xl overflow-hidden">
        <Image src="/generic-book-cover.png" alt="Cover" fill className="object-cover" />
      </div>

      {/* Profile info */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-16 md:-mt-20 px-4">
        <Avatar className="h-32 w-32 border-4 border-white">
          {profileUser.profileImage?.url ? (
            <AvatarImage src={getProfileImageUrl()} alt={profileUser.name} />
          ) : (
            <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B] text-4xl">
              {getInitials(profileUser.name || "")}
            </AvatarFallback>
          )}
        </Avatar>

        <div className="flex-1">
          <h1 className="text-2xl font-bold">{profileUser.name}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
            <span>{followers.length || profileUser.followerCount || 0} followers</span>
            <span>{profileUser.followingCount || 0} following</span>
          </div>
          {profileUser.bio && <p className="mt-2 text-gray-700">{profileUser.bio}</p>}

          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
            {profileUser.location && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {[profileUser.location.city, profileUser.location.state, profileUser.location.country]
                  .filter(Boolean)
                  .join(", ") || "Location not specified"}
              </div>
            )}

            {profileUser.website && (
              <div className="flex items-center">
                <LinkIcon className="h-4 w-4 mr-1" />
                <a href={profileUser.website} className="text-blue-600 hover:underline">
                  {profileUser.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
          </div>
        </div>

        {!isCurrentUser && currentUser && (
          <Button
            variant={isFollowing ? "outline" : "default"}
            onClick={handleFollowToggle}
            disabled={isProcessing}
            className={
              isFollowing
                ? "border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                : "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
            }
          >
            {isProcessing ? (
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : isFollowing ? (
              <UserCheck className="h-4 w-4 mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            {isFollowing ? "Following" : "Follow"}
          </Button>
        )}
      </div>

      {/* Profile tabs */}
      <Tabs defaultValue="posts" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="posts" className="flex-1">
            Posts
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex-1">
            Reviews
          </TabsTrigger>
          <TabsTrigger value="photos" className="flex-1">
            Photos
          </TabsTrigger>
          <TabsTrigger value="about" className="flex-1">
            About
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
