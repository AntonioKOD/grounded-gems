
"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, LinkIcon, UserPlus, UserCheck } from "lucide-react"

import { toast } from "sonner"
import { getImageUrl } from "@/lib/image-utils"
import { useFollow } from "@/hooks/use-follow"

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
  const [activeTab, setActiveTab] = useState("posts")

  // Use the centralized follow hook
  const { isProcessing, handleFollowToggle } = useFollow({
    profileUserId: profileUser?.id || '',
    currentUserId: currentUser?.id,
    initialIsFollowing: isFollowing,
    onFollowStateChange: setIsFollowing,
    onFollowersUpdate: setFollowers,
    onProfileUpdate: setProfileUser
  })

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
