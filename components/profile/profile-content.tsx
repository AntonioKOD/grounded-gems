/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState, useCallback, useTransition, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, Suspense } from "react"
import { useRouter } from "next/navigation"
import {
  Mail,
  MapPin,
  Calendar,
  ExternalLink,
  Instagram,
  Twitter,
  Youtube,
  Globe,
  Award,
  Tag,
  ChevronLeft,
  LogOut,
  Edit3,
  Camera,
  UserPlus,
  UserCheck,
  Settings,
  Share2,
  MoreHorizontal,
  Bookmark,
  Grid3X3,
  Heart,
  MessageCircle,
  Eye,
  Users,
  TrendingUp,
  Star,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { followUser, unfollowUser, getFeedPostsByUser, getFollowers, getFollowing, getUserbyId } from "@/app/actions"
import { PostCard } from "@/components/post/post-card"
import type { Post } from "@/types/feed"
import { useAuth } from "@/hooks/use-auth"
import ProfileSkeleton from "./profile-skeleton"
import PostsGridSkeleton from "./posts-grid-skeleton"
import PostsGrid from "./posts-grid"
import EnhancedPostsGrid from "./enhanced-posts-grid"
import type { UserProfile } from "@/types/user"
import Link from "next/link"
import { logoutUser } from "@/lib/auth"

export default function ProfileContent({
  initialUserData,
  userId,
}: {
  initialUserData: UserProfile | null
  userId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { user: currentUser, isAuthenticated } = useAuth()

  // State
  const [profile, setProfile] = useState<UserProfile | null>(initialUserData)
  const [isLoading, setIsLoading] = useState(!initialUserData)
  const [error, setError] = useState<string | null>(null)
  const [isCurrentUser, setIsCurrentUser] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isProcessingFollow, setIsProcessingFollow] = useState(false)
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [isLoadingSavedPosts, setIsLoadingSavedPosts] = useState(false)
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("posts")
  const [hasLoadedPosts, setHasLoadedPosts] = useState(false)
  const [hasLoadedSavedPosts, setHasLoadedSavedPosts] = useState(false)

  // Helper function to normalize post data
  const normalizePost = useCallback((post: any): any => {
    const normalizedImage =
      post.image && typeof post.image === "string" && post.image.trim() !== ""
        ? post.image.trim()
        : post.image?.url || post.featuredImage?.url || null

    return {
      ...post,
      image: normalizedImage,
    }
  }, [])

  // Check if current user is viewing their own profile
  useEffect(() => {
    if (currentUser && profile) {
      setIsCurrentUser(currentUser.id === profile.id)

      if (followers.length > 0) {
        setIsFollowing(followers.some((follower) => follower.id === currentUser.id))
      }
    }
  }, [currentUser, profile, followers])

  // Fetch profile data if not provided or incomplete
  useEffect(() => {
    const fetchProfileData = async () => {
      if (initialUserData) return

      setIsLoading(true)
      setError(null)

      try {
        const userData = await getUserbyId(userId)

        if (!userData) {
          setError("Could not load this profile. It may not exist or you may not have permission to view it.")
          return
        }

        const mappedProfile: UserProfile = {
          id: userData.id as string,
          email: userData.email || '',
          name: userData.name || '',
          bio: userData.bio || '',
          location: userData.location || null,
          profileImage: userData.profileImage || null,
          createdAt: userData.createdAt || '',
          followerCount: userData.followerCount || 0,
          followingCount: userData.followingCount || 0,
          isCreator: userData.isCreator || false,
          creatorLevel: userData.creatorLevel || undefined,
          interests: userData.interests || [],
          socialLinks: userData.socialLinks || []
        }

        setProfile(mappedProfile)
      } catch (err) {
        console.error("Error fetching profile:", err)
        setError("Failed to load profile data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileData()
  }, [userId, initialUserData])

  // Fetch followers and following data
  useEffect(() => {
    const fetchFollowData = async () => {
      if (!profile?.id) return

      try {
        const [followersData, followingData] = await Promise.all([getFollowers(profile.id), getFollowing(profile.id)])

        setFollowers(followersData || [])
        setFollowing(followingData || [])

        if (currentUser && followersData) {
          setIsFollowing(followersData.some((follower: any) => follower.id === currentUser.id))
        }
      } catch (error) {
        console.error("Error fetching follow data:", error)
      }
    }

    fetchFollowData()
  }, [profile?.id, currentUser])

  // Lazy load posts only when posts tab is active
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!profile?.id || hasLoadedPosts || activeTab !== "posts") return

      setIsLoadingPosts(true)
      try {
        const posts = await getFeedPostsByUser(profile.id)

        const formattedPosts = posts.map((post: any) => {
          const normalizedPost = normalizePost(post)

          return {
            id: post.id,
            author: post.author || {
              id: profile.id,
              name: profile.name || "Unknown",
              avatar: profile.profileImage?.url || "/placeholder.svg",
            },
            title: post.title || "",
            content: post.content || "",
            createdAt: post.createdAt || new Date().toISOString(),
            updatedAt: post.updatedAt || post.createdAt || new Date().toISOString(),
            image: normalizedPost.image,
            likeCount: post.likes?.length || 0,
            commentCount: post.comments?.length || 0,
            isLiked: false,
            type: post.type || "post",
            rating: post.rating || null,
            location: post.location
              ? {
                  id: post.location.id,
                  name: post.location.name,
                }
              : undefined,
            likes: post.likes?.length || 0,
          }
        })

        setUserPosts(formattedPosts)
        setHasLoadedPosts(true)
      } catch (error) {
        console.error("Error fetching user posts:", error)
        toast.error("Failed to load user posts")
      } finally {
        setIsLoadingPosts(false)
      }
    }

    fetchUserPosts()
  }, [profile?.id, activeTab, hasLoadedPosts, normalizePost])

  // Lazy load saved posts only when saved tab is active
  useEffect(() => {
    const fetchSavedPosts = async () => {
      if (!profile?.id || hasLoadedSavedPosts || activeTab !== "saved") return
      if (!isCurrentUser) return // Only current user can see saved posts

      setIsLoadingSavedPosts(true)
      try {
        const response = await fetch(`/api/users/${profile.id}/saved-posts?page=1&limit=50`)
        const data = await response.json()

        if (data.success && data.posts) {
          setSavedPosts(data.posts)
          setHasLoadedSavedPosts(true)
        } else {
          console.error("Failed to load saved posts:", data.error)
          toast.error("Failed to load saved posts")
        }
      } catch (error) {
        console.error("Error fetching saved posts:", error)
        toast.error("Failed to load saved posts")
      } finally {
        setIsLoadingSavedPosts(false)
      }
    }

    fetchSavedPosts()
  }, [profile?.id, activeTab, hasLoadedSavedPosts, isCurrentUser])

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout failed:", error)
      toast.error("Failed to log out")
    }
  }

  const handleFollowToggle = async () => {
    if (isProcessingFollow || !profile || !currentUser?.id) return

    setIsProcessingFollow(true)
    try {
      if (isFollowing) {
        await unfollowUser(profile.id, currentUser.id)
        toast.success(`Unfollowed ${profile.name || "user"}`)

        setProfile((prev: UserProfile | null) =>
          prev
            ? {
                ...prev,
                followerCount: Math.max(0, (prev.followerCount || 1) - 1),
              }
            : null
        )

        setFollowers((prev) => prev.filter((follower) => follower.id !== currentUser.id))
      } else {
        await followUser(profile.id, currentUser.id)
        toast.success(`Now following ${profile.name || "user"}`)

        setProfile((prev: UserProfile | null) =>
          prev
            ? {
                ...prev,
                followerCount: (prev.followerCount || 0) + 1,
              }
            : null,
        )

        setFollowers((prev) => [...prev, { id: currentUser.id, name: currentUser.name }])
      }

      setIsFollowing(!isFollowing)

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

  // Get user initials for avatar
  const getInitials = () => {
    if (!profile) return "U"
    if (profile.name) {
      return profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    }
    return profile.email.charAt(0).toUpperCase()
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
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: "🌟",
        progress: 25,
        description: "Just starting to share local discoveries",
      },
      hunter: {
        title: "Hidden Gem Hunter",
        color: "bg-blue-50 text-blue-700 border-blue-200",
        icon: "🔍",
        progress: 50,
        description: "Actively finding and sharing hidden gems",
      },
      authority: {
        title: "Local Authority",
        color: "bg-purple-50 text-purple-700 border-purple-200",
        icon: "👑",
        progress: 75,
        description: "Recognized expert on local destinations",
      },
      expert: {
        title: "Destination Expert",
        color: "bg-amber-50 text-amber-700 border-amber-200",
        icon: "🏆",
        progress: 100,
        description: "Top-tier creator with extensive knowledge",
      },
    }

    return level && level in levels
      ? levels[level as keyof typeof levels]
      : {
          title: "Community Member",
          color: "bg-gray-50 text-gray-700 border-gray-200",
          icon: "👤",
          progress: 0,
          description: "Part of our amazing community",
        }
  }

  // Get social icon
  const getSocialIcon = useCallback((platform: string) => {
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
        return <ExternalLink className="h-4 w-4" />
    }
  }, [])

  // Loading state
  if (isLoading) {
    return <ProfileSkeleton />
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <AlertDescription className="text-red-600 text-2xl">⚠️</AlertDescription>
              </div>
              <h2 className="text-xl font-semibold text-red-800 mb-2">Profile Not Available</h2>
              <p className="text-red-600 mb-6">{error}</p>
              <Button onClick={() => router.push("/")} className="bg-red-600 hover:bg-red-700 text-white">
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) return null

  const creatorLevel = getCreatorLevelDetails(profile.creatorLevel)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Modern Header Section */}
      <div className="relative bg-gradient-to-r from-[#FF6B6B] via-[#FF8E53] to-[#FFD93D] pb-32">
        {/* Navigation */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/90 hover:bg-white text-gray-700 border-0 backdrop-blur-md shadow-lg transition-all duration-200 hover:scale-105"
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="flex gap-3">
            {!isCurrentUser && (
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/90 hover:bg-white text-gray-700 border-0 backdrop-blur-md shadow-lg transition-all duration-200 hover:scale-105"
              >
                <Share2 className="h-4 w-4" />
                <span className="sr-only">Share</span>
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/90 hover:bg-white text-gray-700 border-0 backdrop-blur-md shadow-lg transition-all duration-200 hover:scale-105"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-md border-white/20 shadow-xl">
                {isCurrentUser ? (
                  <>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href={`/profile/${profile.id}/edit`} className="flex items-center">
                        <Edit3 className="h-4 w-4 mr-3" />
                        <span>Edit Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href={`/profile/${profile.id}/location-dashboard`} className="flex items-center">
                        <MapPin className="h-4 w-4 mr-3" />
                        <span>My Locations</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="h-4 w-4 mr-3" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <Separator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer focus:text-red-700 focus:bg-red-50">
                      <LogOut className="h-4 w-4 mr-3" />
                      <span>Log Out</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem className="cursor-pointer">
                      <Share2 className="h-4 w-4 mr-3" />
                      <span>Share Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <MessageCircle className="h-4 w-4 mr-3" />
                      <span>Send Message</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Bookmark className="h-4 w-4 mr-3" />
                      <span>Save Profile</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="relative -mt-24 z-10 px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Main Profile Card */}
          <Card className="mb-6 overflow-hidden shadow-xl border-0 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-0">
              {/* Profile Header */}
              <div className="p-6 pb-4">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {/* Avatar */}
                  <div className="relative group">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 relative">
                      <Avatar className="w-full h-full border-4 border-white shadow-lg">
                        {profile.profileImage ? (
                          <AvatarImage src={profile.profileImage.url || "/placeholder.svg"} alt={profile.name || "User"} />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] text-white text-2xl font-bold">
                            {getInitials()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {isCurrentUser && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <Camera className="h-6 w-6 text-white" />
                        </div>
                      )}
                      {profile.isCreator && (
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-r from-[#FFD93D] to-[#FF6B6B] rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                          <span className="text-sm">{creatorLevel.icon}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 truncate">
                          {profile.name || "User"}
                        </h1>
                        
                        {/* Creator Badge */}
                        {profile.isCreator && (
                          <Badge className={`${creatorLevel.color} border px-3 py-1 mb-3 font-medium`}>
                            <Award className="h-3 w-3 mr-1" />
                            {creatorLevel.title}
                          </Badge>
                        )}

                        {/* Bio */}
                        {profile.bio && (
                          <p className="text-gray-700 mb-3 leading-relaxed">{profile.bio}</p>
                        )}

                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            <span className="truncate">{profile.email}</span>
                          </div>
                          
                          {profile.location && (profile.location.city || profile.location.country) && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span>
                                {[profile.location.city, profile.location.state, profile.location.country]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>Joined {formatDate(profile.createdAt)}</span>
                          </div>
                        </div>

                        {/* Social Links */}
                        {profile.socialLinks && profile.socialLinks.length > 0 && (
                          <div className="flex items-center gap-2 mt-3">
                            {profile.socialLinks.map((link: { url: string | undefined; platform: string | undefined }, index: Key | null | undefined) => (
                              <a
                                key={index}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors flex items-center justify-center"
                                title={link.platform}
                              >
                                {getSocialIcon(link.platform || 'website')}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      {!isCurrentUser && currentUser && (
                        <Button
                          onClick={handleFollowToggle}
                          disabled={isProcessingFollow}
                          size="sm"
                          className={
                            isFollowing
                              ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                              : "bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] hover:from-[#FF5252] hover:to-[#FF7043] text-white border-0"
                          }
                        >
                          {isProcessingFollow ? (
                            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                          ) : isFollowing ? (
                            <UserCheck className="h-4 w-4 mr-2" />
                          ) : (
                            <UserPlus className="h-4 w-4 mr-2" />
                          )}
                          {isFollowing ? "Following" : "Follow"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Section */}
              <div className="px-6 py-4 bg-gray-50/50 border-t">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">{userPosts.length}</div>
                    <div className="text-xs sm:text-sm text-gray-500">Posts</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">
                      {followers.length || profile.followerCount || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500">Followers</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">
                      {following.length || profile.followingCount || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500">Following</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Tabs */}
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-6 pb-0">
                <TabsList className="w-full h-14 bg-gray-100/50 p-1 rounded-xl">
                  <TabsTrigger
                    value="posts"
                    className="flex-1 data-[state=active]:bg-white data-[state=active]:text-[#FF6B6B] data-[state=active]:shadow-sm font-medium rounded-lg transition-all duration-300 flex items-center gap-2 px-4 py-3"
                  >
                    <Grid3X3 className="h-4 w-4" />
                    <span>Posts</span>
                    <span className="ml-1 px-2 py-0.5 bg-gray-200 data-[state=active]:bg-[#FF6B6B]/10 rounded-full text-xs font-semibold">
                      {userPosts.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="saved"
                    className="flex-1 data-[state=active]:bg-white data-[state=active]:text-[#FF6B6B] data-[state=active]:shadow-sm font-medium rounded-lg transition-all duration-300 flex items-center gap-2 px-4 py-3"
                  >
                    <Bookmark className="h-4 w-4" />
                    <span>Saved</span>
                    {isCurrentUser && (
                      <span className="ml-1 px-2 py-0.5 bg-gray-200 data-[state=active]:bg-[#FF6B6B]/10 rounded-full text-xs font-semibold">
                        {savedPosts.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="about"
                    className="flex-1 data-[state=active]:bg-white data-[state=active]:text-[#FF6B6B] data-[state=active]:shadow-sm font-medium rounded-lg transition-all duration-300 flex items-center gap-2 px-4 py-3"
                  >
                    <Users className="h-4 w-4" />
                    <span>About</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="posts" className="mt-0">
                <div className="p-6 pt-4">
                  {/* Grid Layout Switcher */}
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Posts {userPosts.length > 0 && `(${userPosts.length})`}
                    </h3>
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        onClick={() => {/* Switch to dynamic layout */}}
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2"
                        onClick={() => {/* Switch to masonry layout */}}
                      >
                        <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                          <div className="bg-current rounded-sm h-1.5"></div>
                          <div className="bg-current rounded-sm h-2"></div>
                          <div className="bg-current rounded-sm h-2"></div>
                          <div className="bg-current rounded-sm h-1.5"></div>
                        </div>
                      </Button>
                    </div>
                  </div>
                  
                  <Suspense fallback={<PostsGridSkeleton />}>
                    {isLoadingPosts ? (
                      <PostsGridSkeleton />
                    ) : (
                      <EnhancedPostsGrid
                        posts={userPosts}
                        isCurrentUser={isCurrentUser}
                        gridType="dynamic"
                      />
                    )}
                  </Suspense>
                </div>
              </TabsContent>

              <TabsContent value="saved" className="mt-0">
                <div className="p-6 pt-4">
                  {!isCurrentUser ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                        <Bookmark className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        Private collection
                      </h3>
                      <p className="text-gray-500">
                        Only {profile?.name || "this user"} can see their saved posts.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Saved Posts Header */}
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Saved Posts {savedPosts.length > 0 && `(${savedPosts.length})`}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Your collection of saved discoveries
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-[#FFD93D]/20 text-[#FF8E53] border-[#FFD93D]/30">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Masonry View
                          </Badge>
                        </div>
                      </div>
                      
                      <Suspense fallback={<PostsGridSkeleton />}>
                        {isLoadingSavedPosts ? (
                          <PostsGridSkeleton />
                        ) : (
                          <EnhancedPostsGrid
                            posts={savedPosts}
                            isCurrentUser={isCurrentUser}
                            gridType="masonry"
                          />
                        )}
                      </Suspense>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="about" className="mt-0">
                <div className="p-6 pt-4 space-y-6">
                  {/* About Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center">
                          <Mail className="h-5 w-5 mr-2 text-[#FF6B6B]" />
                          Contact
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <p className="text-gray-900">{profile.email}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center">
                          <MapPin className="h-5 w-5 mr-2 text-[#FF6B6B]" />
                          Location
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {profile.location ? (
                          <div>
                            {profile.location.city && <p className="text-gray-900">{profile.location.city}</p>}
                            {profile.location.state && <p className="text-gray-900">{profile.location.state}</p>}
                            {profile.location.country && <p className="text-gray-900">{profile.location.country}</p>}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">No location provided</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Bio Section */}
                  <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">About {profile.name || "User"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {profile.bio ? (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No bio provided</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Interests */}
                  {profile.interests && profile.interests.length > 0 && (
                    <Card className="border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center">
                          <Tag className="h-5 w-5 mr-2 text-[#FF6B6B]" />
                          Interests
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {profile.interests.map((item: { interest: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined }, index: Key | null | undefined) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="px-3 py-1 bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]/20 hover:bg-[#FF6B6B]/20 transition-colors"
                            >
                              {item.interest}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Creator Info */}
                  {profile.isCreator && (
                    <Card className="border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center">
                          <Award className="h-5 w-5 mr-2 text-[#FF6B6B]" />
                          Creator Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-[#FF6B6B] to-[#FFD93D] rounded-full flex items-center justify-center text-xl">
                            {creatorLevel.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{creatorLevel.title}</h3>
                            <p className="text-sm text-gray-600">{creatorLevel.description}</p>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600">Creator Progress</span>
                            <span className="font-medium">{creatorLevel.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FFD93D] transition-all duration-500"
                              style={{ width: `${creatorLevel.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Member Since */}
                  <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-[#FF6B6B]" />
                        Member Since
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-900 font-medium">{formatDate(profile.createdAt)}</p>
                      <p className="text-sm text-gray-500 mt-1" suppressHydrationWarning>
                        {profile.createdAt && typeof window !== 'undefined'
                          ? `${Math.ceil((new Date().getTime() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days on Grounded Gems`
                          : 'Member of Grounded Gems'
                        }
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  )
}
