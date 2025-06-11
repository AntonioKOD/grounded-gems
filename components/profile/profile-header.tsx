/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Calendar, LinkIcon, UserPlus, UserCheck } from "lucide-react"
import { followUser, unfollowUser } from "@/app/actions"
import { toast } from "sonner"
import { getImageUrl } from "@/lib/image-utils"

interface ProfileHeaderProps {
  profileUser: any
  currentUser: any
  isCurrentUser: boolean
  isFollowing: boolean
  setIsFollowing: (value: boolean) => void
  followers: any[]
  setFollowers: (followers: any[]) => void
}

export default function ProfileHeader({
  profileUser,
  currentUser,
  isCurrentUser,
  isFollowing,
  setIsFollowing,
  followers,
  setFollowers,
}: ProfileHeaderProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState("posts")
  const lastFollowActionRef = useRef<number>(0)

  const handleFollowToggle = async () => {
    if (isProcessing || !currentUser) return

    // Rate limit follow actions to prevent spam
    const now = Date.now()
    const timeSinceLastAction = now - lastFollowActionRef.current
    if (timeSinceLastAction < 2000) { // Minimum 2 seconds between actions
      toast.error("Please wait before performing another follow action")
      return
    }

    setIsProcessing(true)
    lastFollowActionRef.current = now

    try {
      console.log(`${isFollowing ? 'Unfollowing' : 'Following'} user:`, profileUser.id)
      
      if (isFollowing) {
        await unfollowUser(profileUser.id, currentUser.id)
        toast.success(`Unfollowed ${profileUser.name}`)
        // Update followers list
        setFollowers(followers.filter((follower) => follower.id !== currentUser.id))
      } else {
        await followUser(profileUser.id, currentUser.id)
        toast.success(`Now following ${profileUser.name}`)
        // Update followers list
        setFollowers([...followers, currentUser])
      }

      setIsFollowing(!isFollowing)

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    } catch (error: any) {
      console.error("Error toggling follow:", error)
      
      // Handle specific error types
      if (error.message?.includes('429')) {
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
      }, 1000)
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
            {profileUser.createdAt && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Joined {new Date(profileUser.createdAt).toLocaleDateString()}
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
