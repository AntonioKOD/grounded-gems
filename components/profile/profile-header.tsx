/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Mail,
  MapPin,
  Calendar,
  Instagram,
  Twitter,
  Youtube,
  Globe,
  Award,
  Edit3,
  Camera,
  Users,
  UserPlus,
  UserCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { followUser, unfollowUser } from "@/app/actions"

interface SocialLink {
  platform: "instagram" | "twitter" | "tiktok" | "youtube" | "website"
  url: string
}

interface Location {
  city?: string
  state?: string
  country?: string
}

interface ProfileHeaderProps {
  profile: {
    id: string
    email: string
    name?: string
    createdAt?: string
    bio?: string
    location?: Location
    profileImage?: {
      url: string
    }
    isCreator?: boolean
    creatorLevel?: "explorer" | "hunter" | "authority" | "expert"
    socialLinks?: SocialLink[]
    followerCount?: number
    followingCount?: number
  }
  isCurrentUser: boolean
  isFollowing: boolean
  currentUser: any
  followers: any[]
  following: any[]
  onFollowToggle?: () => void
  className?: string
}

export function ProfileHeader({
  profile,
  isCurrentUser,
  isFollowing,
  currentUser,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  followers,
  following,
  className = "",
}: ProfileHeaderProps) {
  const router = useRouter()
  const [isProcessingFollow, setIsProcessingFollow] = useState(false)
  const [localIsFollowing, setLocalIsFollowing] = useState(isFollowing)
  const [followerCount, setFollowerCount] = useState(profile.followerCount || 0)

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!profile.name) return "U"
    return profile.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Get creator level details
  const getCreatorLevelDetails = (level?: string) => {
    const levels = {
      explorer: {
        title: "Local Explorer",
        color: "bg-emerald-100 text-emerald-800",
        progress: 25,
        description: "Just starting to share local discoveries",
      },
      hunter: {
        title: "Hidden Gem Hunter",
        color: "bg-blue-100 text-blue-800",
        progress: 50,
        description: "Actively finding and sharing hidden gems",
      },
      authority: {
        title: "Local Authority",
        color: "bg-purple-100 text-purple-800",
        progress: 75,
        description: "Recognized expert on local destinations",
      },
      expert: {
        title: "Destination Expert",
        color: "bg-amber-100 text-amber-800",
        progress: 100,
        description: "Top-tier creator with extensive knowledge",
      },
    }

    return level && level in levels
      ? levels[level as keyof typeof levels]
      : {
          title: "Member",
          color: "bg-gray-100 text-gray-800",
          progress: 0,
          description: "Regular community member",
        }
  }

  // Get social icon
  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case "instagram":
        return <Instagram className="h-4 w-4" />
      case "twitter":
        return <Twitter className="h-4 w-4" />
      case "youtube":
        return <Youtube className="h-4 w-4" />
      case "website":
        return <Globe className="h-4 w-4" />
      case "tiktok":
        return (
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
          >
            <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
          </svg>
        )
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  const handleFollowToggle = async () => {
    if (isProcessingFollow || !profile || !currentUser) return

    setIsProcessingFollow(true)
    try {
      if (localIsFollowing) {
        await unfollowUser(profile.id, currentUser.id)
        toast.success(`Unfollowed ${profile.name || "user"}`)
        setFollowerCount((prev) => prev - 1)
      } else {
        await followUser(profile.id, currentUser.id)
        toast.success(`Now following ${profile.name || "user"}`)
        setFollowerCount((prev) => prev + 1)
      }

      setLocalIsFollowing(!localIsFollowing)

      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
      toast.error("Failed to update follow status")
    } finally {
      setIsProcessingFollow(false)
    }
  }

  const creatorLevel = getCreatorLevelDetails(profile.creatorLevel)

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}>
      {/* Cover image */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-[#FF6B6B]/80 to-[#FF9B6B]/80 relative">
        {isCurrentUser && (
          <Button
            size="sm"
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white"
            onClick={() => router.push("/profile/edit")}
          >
            <Edit3 className="h-4 w-4 mr-1" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Profile image and basic info */}
      <div className="px-6 pb-6 pt-0 bg-white rounded-t-3xl -mt-6 relative z-10 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-16 mb-6">
          <div className="relative group">
            <Avatar className="h-32 w-32 border-4 border-white shadow-md">
              {profile.profileImage ? (
                <AvatarImage src={profile.profileImage.url || "/placeholder.svg"} alt={profile.name || "User"} />
              ) : (
                <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B] text-4xl">{getInitials()}</AvatarFallback>
              )}
            </Avatar>
            {isCurrentUser && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="h-8 w-8 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">{profile.name || "User"}</h1>
                <div className="flex items-center text-gray-600 mt-1">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>{profile.email}</span>
                </div>
                {profile.location && (profile.location.city || profile.location.country) && (
                  <div className="flex items-center text-gray-600 mt-1">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>
                      {[profile.location.city, profile.location.state, profile.location.country]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
              </div>

              {!isCurrentUser && currentUser && (
                <Button
                  variant={localIsFollowing ? "outline" : "default"}
                  onClick={handleFollowToggle}
                  disabled={isProcessingFollow}
                  className={
                    localIsFollowing
                      ? "border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                      : "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
                  }
                >
                  {isProcessingFollow ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : localIsFollowing ? (
                    <UserCheck className="h-4 w-4 mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {localIsFollowing ? "Following" : "Follow"}
                </Button>
              )}

              {profile.isCreator && (
                <div className="flex flex-col items-start md:items-end">
                  <Badge className={`${creatorLevel.color} px-3 py-1 text-sm font-medium`}>
                    <Award className="h-4 w-4 mr-1" />
                    {creatorLevel.title}
                  </Badge>
                  <div className="mt-2 w-full max-w-[200px]">
                    <Progress value={creatorLevel.progress} className="h-2" />
                  </div>
                </div>
              )}
            </div>

            {/* Follower stats */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1 text-gray-500" />
                <span className="text-sm font-medium">{followerCount}</span>
                <span className="text-sm text-gray-500 ml-1">Followers</span>
              </div>
              <div className="flex items-center">
                <UserCheck className="h-4 w-4 mr-1 text-gray-500" />
                <span className="text-sm font-medium">{following.length || 0}</span>
                <span className="text-sm text-gray-500 ml-1">Following</span>
              </div>
            </div>

            {/* Social links */}
            {profile.socialLinks && profile.socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {profile.socialLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition-colors"
                  >
                    {getSocialIcon(link.platform)}
                    <span className="ml-1 capitalize">{link.platform}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Member since */}
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <Calendar className="h-4 w-4 mr-1" />
          <span>Member since {formatDate(profile.createdAt)}</span>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mb-6">
            <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
          </div>
        )}
      </div>
    </div>
  )
}
