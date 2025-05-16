/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Mail, MapPin, Calendar, ExternalLink, Instagram, Twitter, Youtube, Globe, Award, Tag, ChevronLeft, LogOut, Edit3, Camera, UserPlus, UserCheck, Settings } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { followUser, unfollowUser, getFeedPostsByUser, getUserbyId, getFollowers, getFollowing } from "@/app/actions"
import { PostCard } from "@/components/post/post-card"
import type { Post } from "@/types/feed"

interface SocialLink {
  platform: "instagram" | "twitter" | "tiktok" | "youtube" | "website"
  url: string
}

interface Location {
  city?: string
  state?: string
  country?: string
}

interface Interest {
  interest: string
}

interface UserProfile {
  id: string
  email: string
  name?: string
  createdAt?: string
  bio?: string
  location?: Location
  profileImage?: {
    url: string
  }
  interests?: Interest[]
  isCreator?: boolean
  creatorLevel?: "explorer" | "hunter" | "authority" | "expert"
  socialLinks?: SocialLink[]
  followerCount?: number
  followingCount?: number
  isFollowing?: boolean
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCurrentUser, setIsCurrentUser] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isProcessingFollow, setIsProcessingFollow] = useState(false)
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const userId = params.id
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("posts")

  // Helper function to normalize post data
  const normalizePost = (post: any): any => {
    // Ensure image is a valid non-empty string or null
    const normalizedImage =
      post.image && typeof post.image === "string" && post.image.trim() !== ""
        ? post.image.trim()
        : post.image?.url || post.featuredImage?.url || null

    return {
      ...post,
      image: normalizedImage,
    }
  }

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const profileId = params.id as string

        // First, fetch the current user to determine if we're viewing our own profile
        let currentUser = null
        try {
          const currentUserRes = await fetch("/api/users/me", {
            credentials: "include",
          })

          if (currentUserRes.ok) {
            const data = await currentUserRes.json()
            currentUser = data.user
            setCurrentUser(currentUser)
            setCurrentUserId(currentUser.id)
            console.log("Current user fetched successfully:", currentUser)
          } else {
            console.log("Failed to fetch current user, status:", currentUserRes.status)
          }
        } catch (error) {
          console.error("Error fetching current user:", error)
        }

        // If we have a profile ID in the URL and it's not "me"
        if (profileId && profileId !== "me") {
          console.log(`Fetching specific user profile with ID: ${profileId}`)

          // Use getUserbyId to fetch the profile
          const userProfile = await getUserbyId(profileId)
          console.log("getUserbyId result:", userProfile)

          if (!userProfile) {
            console.warn("No user data returned for ID:", profileId)
            // Create a placeholder profile
            const placeholderProfile = {
              id: profileId,
              name: `User ${profileId.substring(0, 5)}`,
              email: `user${profileId.substring(0, 5)}@example.com`,
              bio: "This user profile is not available or has been deleted.",
              followerCount: 0,
              followingCount: 0,
              isFollowing: false,
            }

            setProfile(placeholderProfile)
            setIsCurrentUser(false)
            setIsFollowing(false)
          } else {
            // Set the profile with the fetched user data
            setProfile({
              id: userProfile.id as string,
              email: userProfile.email || "unknown@example.com",
              name: userProfile.name,
              createdAt: userProfile.createdAt,
              bio: userProfile.bio,
              location: userProfile.location,
              profileImage: userProfile.profileImage,
              interests: userProfile.interests,
              isCreator: userProfile.isCreator,
              creatorLevel: userProfile.creatorLevel,
              socialLinks: userProfile.socialLinks,
              followerCount: userProfile.followerCount,
              followingCount: userProfile.followingCount,
              isFollowing: userProfile.isFollowing,
            })
            console.log("Profile set successfully:", userProfile)

            // Check if this is the current user's profile
            setIsCurrentUser(currentUser && currentUser.id === profileId)
            const followers = await getFollowers(profileId)
            setFollowers(followers)
            const following = await getFollowing(profileId)
            setFollowing(following)

            if (followers.map((follower: any) => follower.id).includes(currentUser?.id as string)) {
              setIsFollowing(true)
            }
          }
        } else {
          // We're viewing our own profile (either directly or via /me)
          console.log("Fetching current user profile")

          if (!currentUser) {
            // Try to fetch current user again if we don't have it
            const res = await fetch("/api/users/me", {
              credentials: "include",
            })

            if (!res.ok) {
              console.error("Failed to fetch current user, status:", res.status)
              throw new Error("Not authenticated")
            }

            const data = await res.json()
            currentUser = data.user
          }

          if (!currentUser) {
            throw new Error("User data not found")
          }

          setProfile(currentUser)
          setIsCurrentUser(true)
        }

        // Add follower stats if not present (after profile is set)
        setProfile((prev) => {
          if (!prev) return prev

          return {
            ...prev,
            followerCount: prev.followerCount || Math.floor(Math.random() * 1000) + 10,
            followingCount: prev.followingCount || Math.floor(Math.random() * 500) + 5,
          }
        })
      } catch (err) {
        console.error("Error in fetchProfile:", err)
        setError(
          params.id && params.id !== "me"
            ? "Could not load this profile. It may not exist or you may not have permission to view it."
            : "Could not load your profile. Please log in.",
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [userId, params.id])

  // Fetch user posts
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!profile) return

      setIsLoadingPosts(true)
      try {
        console.log(`Fetching posts for user ID: ${profile.id}`)
        // Use the new getFeedPostsByUser function
        const posts = await getFeedPostsByUser(profile.id)
        console.log(`Received ${posts.length} posts for user ID: ${profile.id}`)

        // Map the posts to match the expected format if needed
        const formattedPosts = posts.map((post: any) => {
          // Normalize the post
          const normalizedPost = normalizePost(post)
          
          // Ensure the post has all required fields for the FeedPost component
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
            image: normalizedPost.image,
            likeCount: post.likes?.length || 0,
            commentCount: post.comments?.length || 0,
            isLiked: false, // You might need to determine this based on current user
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
       

        console.log("Normalized posts:", formattedPosts.map(p => ({ id: p.id, image: p.image })))
        setUserPosts(formattedPosts)
      } catch (error) {
        console.error("Error fetching user posts:", error)
        toast.error("Failed to load user posts")
        setUserPosts([])
      } finally {
        setIsLoadingPosts(false)
      }
    }

    if (profile) {
      fetchUserPosts()
    }
  }, [profile])

  const handleLogout = async () => {
    try {
      await fetch("/api/users/logout", {
        method: "POST",
        credentials: "include",
      })
      toast.success("Successfully logged out")
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
      toast.error("Failed to log out")
    }
  }

  const handleFollowToggle = async () => {
    if (isProcessingFollow || !profile) return

    setIsProcessingFollow(true)
    try {
      if (isFollowing) {
        await unfollowUser(profile.id as string, currentUser?.id as string)
        toast.success(`Unfollowed ${profile.name || "user"}`)
        // Update follower count
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                followerCount: (prev.followerCount || 0) - 1,
              }
            : null,
        )
      } else {
        await followUser(profile.id as string, currentUser?.id as string)

        toast.success(`Now following ${profile.name || "user"}`)
        // Update follower count
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                followerCount: (prev.followerCount || 0) + 1,
              }
            : null,
        )
      }

      setIsFollowing(!isFollowing)

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
        return <ExternalLink className="h-4 w-4" />
    }
  }

  // Loading state
  if (isLoading) {
    return <ProfileSkeleton />
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle className="text-lg font-semibold">Profile Not Available</AlertTitle>
          <AlertDescription className="mt-2">{error}</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button
            onClick={() => router.push(params.id ? "/" : "/login")}
            className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white"
          >
            {params.id ? "Return Home" : "Go to Login"}
          </Button>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const creatorLevel = getCreatorLevelDetails(profile.creatorLevel)

  console.log("Rendering profile:", {
    id: profile.id,
    name: profile.name,
    isCurrentUser,
    isFollowing,
  })

  return (
    <main className="bg-gray-50">
      {/* Hero Section with Cover Image */}
      <div className="relative w-full h-64 md:h-80 bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] overflow-hidden">
        {/* Back button */}
        <div className="absolute top-4 left-4 z-10">
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-white/90 hover:bg-white border-0 shadow-sm" 
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
        
        {/* Actions for current user */}
        {isCurrentUser && (
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white/90 hover:bg-white border-0 shadow-sm"
              onClick={() => router.push(`/profile/${profile.id}/edit`)}
            >
              <Edit3 className="h-4 w-4 mr-1" />
              Edit Profile
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white/90 hover:bg-white border-0 shadow-sm"
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </div>
        )}

        {/* Decorative pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[url('/placeholder.svg?key=kj61m')] bg-repeat"></div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/40"></div>
      </div>

      <div className="container max-w-5xl px-4 sm:px-6 -mt-24 relative z-10">
        {/* Profile Card */}
        <Card className="overflow-visible shadow-lg border-0 mb-8">
          <CardContent className="p-0">
            <div className="p-6 pb-0 relative">
              {/* Avatar */}
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
                <div className="relative -mt-20 group z-20">
                  <Avatar className="h-32 w-32 border-4 border-white shadow-md">
                    {profile.profileImage ? (
                      <AvatarImage src={profile.profileImage.url || "/placeholder.svg"} alt={profile.name || "User"} />
                    ) : (
                      <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B] text-4xl">
                        {getInitials()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {isCurrentUser && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-8">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">{profile.name || "User"}</h1>
                      
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <div className="flex items-center text-gray-600">
                          <Mail className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="text-sm">{profile.email}</span>
                        </div>
                        
                        {profile.location && (profile.location.city || profile.location.country) && (
                          <div className="flex items-center text-gray-600">
                            <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="text-sm">
                              {[profile.location.city, profile.location.state, profile.location.country]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="text-sm">Joined {formatDate(profile.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Follow button for non-owners */}
                    {!isCurrentUser && currentUser && (
                      <Button
                        variant={isFollowing ? "outline" : "default"}
                        onClick={handleFollowToggle}
                        disabled={isProcessingFollow}
                        size="sm"
                        className={
                          isFollowing
                            ? "border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10 min-w-[100px]"
                            : "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 min-w-[100px]"
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

                  {/* Creator badge */}
                  {profile.isCreator && (
                    <div className="mt-4">
                      <Badge className={`${creatorLevel.color} px-3 py-1 text-sm font-medium`}>
                        <Award className="h-4 w-4 mr-1" />
                        {creatorLevel.title}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="mt-6">
                  <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                </div>
              )}
              
              {/* Stats Row */}
              <div className="flex flex-wrap gap-6 mt-6 pb-6 border-b">
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold text-gray-900">{userPosts.length}</span>
                  <span className="text-sm text-gray-500">Posts</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold text-gray-900">{followers.length || profile.followerCount || 0}</span>
                  <span className="text-sm text-gray-500">Followers</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold text-gray-900">{following.length || profile.followingCount || 0}</span>
                  <span className="text-sm text-gray-500">Following</span>
                </div>
                
                {/* Social links */}
                {profile.socialLinks && profile.socialLinks.length > 0 && (
                  <div className="ml-auto flex flex-wrap gap-2 items-center">
                    {profile.socialLinks.map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                        title={link.platform}
                      >
                        {getSocialIcon(link.platform)}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6">
                <TabsList className="w-full justify-start border-b pb-0 bg-transparent h-auto rounded-none">
                  <TabsTrigger 
                    value="posts" 
                    className="py-3 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B6B] data-[state=active]:text-[#FF6B6B] data-[state=active]:bg-transparent"
                  >
                    Posts
                  </TabsTrigger>
                  <TabsTrigger 
                    value="about" 
                    className="py-3 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B6B] data-[state=active]:text-[#FF6B6B] data-[state=active]:bg-transparent"
                  >
                    About
                  </TabsTrigger>
                  {profile.interests && profile.interests.length > 0 && (
                    <TabsTrigger 
                      value="interests" 
                      className="py-3 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B6B] data-[state=active]:text-[#FF6B6B] data-[state=active]:bg-transparent"
                    >
                      Interests
                    </TabsTrigger>
                  )}
                  {profile.isCreator && (
                    <TabsTrigger 
                      value="creator" 
                      className="py-3 px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-[#FF6B6B] data-[state=active]:text-[#FF6B6B] data-[state=active]:bg-transparent"
                    >
                      Creator
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <TabsContent value="posts" className="p-6 pt-4">
                {isLoadingPosts ? (
                  <div className="space-y-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-3 w-[150px]" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-[200px] w-full rounded-md" />
                      </div>
                    ))}
                  </div>
                ) : userPosts.length > 0 ? (
                  <div className="space-y-6">
                    {userPosts.map((post) => (
                      (currentUser && (
                      <PostCard 
                        user={{
                          id: currentUser.id,
                          name: currentUser.name || "Unknown User",
                          avatar: currentUser.profileImage?.url
                        }} 
                        key={post.id} 
                        post={post} 
                      />
                    ))))}
                  </div>
                ) : (
                  <Card className="bg-gray-50 border border-dashed">
                    <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="bg-white p-3 rounded-full shadow-sm mb-4">
                        <Camera className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">No posts yet</h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        {isCurrentUser
                          ? "You haven't shared any posts yet. Start sharing your experiences!"
                          : "This user hasn't shared any posts yet. Check back later!"}
                      </p>
                      {isCurrentUser && (
                        <Button className="mt-6 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">Create Your First Post</Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="about" className="p-6 pt-4">
                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">About {profile.name || "User"}</CardTitle>
                    <CardDescription>Personal information and details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-base font-medium mb-3 text-gray-900 flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-[#FF6B6B]" />
                          Contact Info
                        </h3>
                        <div className="space-y-3 pl-6">
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-500">Email</span>
                            <span className="text-gray-800">{profile.email}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base font-medium mb-3 text-gray-900 flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-[#FF6B6B]" />
                          Location
                        </h3>
                        <div className="space-y-3 pl-6">
                          {profile.location ? (
                            <div className="flex flex-col">
                              {profile.location.city && <span className="text-gray-800">{profile.location.city}</span>}
                              {profile.location.state && <span className="text-gray-800">{profile.location.state}</span>}
                              {profile.location.country && <span className="text-gray-800">{profile.location.country}</span>}
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">No location provided</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div>
                      <h3 className="text-base font-medium mb-3 text-gray-900">Bio</h3>
                      {profile.bio ? (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No bio provided</p>
                      )}
                    </div>

                    <Separator className="my-6" />

                    <div>
                      <h3 className="text-base font-medium mb-3 text-gray-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-[#FF6B6B]" />
                        Member Since
                      </h3>
                      <p className="text-gray-800">{formatDate(profile.createdAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {profile.interests && profile.interests.length > 0 && (
                <TabsContent value="interests" className="p-6 pt-4">
                  <Card className="bg-white border-0 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl">Interests</CardTitle>
                      <CardDescription>Things {profile.name || "this user"} is interested in</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map((item, index) => (
                          <Badge key={index} variant="secondary" className="px-3 py-1 bg-[#FF6B6B]/10 text-[#FF6B6B] border-0">
                            <Tag className="h-3 w-3 mr-1" />
                            {item.interest}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {profile.isCreator && (
                <TabsContent value="creator" className="p-6 pt-4">
                  <Card className="bg-white border-0 shadow-sm mb-6">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl">Creator Status</CardTitle>
                      <CardDescription>Information about {profile.name || "this user"} as a creator</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-6">
                        <div className="flex items-center mb-3">
                          <div className="bg-[#FF6B6B]/10 p-2 rounded-full mr-3">
                            <Award className="h-5 w-5 text-[#FF6B6B]" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{creatorLevel.title}</h3>
                            <p className="text-gray-600 text-sm">{creatorLevel.description}</p>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                            <div 
                              className="h-2 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53]" 
                              style={{ width: `${creatorLevel.progress}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Explorer</span>
                            <span>Hunter</span>
                            <span>Authority</span>
                            <span>Expert</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {profile.socialLinks && profile.socialLinks.length > 0 && (
                    <Card className="bg-white border-0 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xl">Connect</CardTitle>
                        <CardDescription>Follow {profile.name || "this creator"} on social media</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {profile.socialLinks.map((link, index) => (
                            <a
                              key={index}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center p-4 rounded-lg border border-gray-100 hover:border-[#FF6B6B] hover:shadow-sm transition-all group"
                            >
                              <div className="h-10 w-10 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center mr-3 group-hover:bg-[#FF6B6B]/20 transition-colors">
                                {getSocialIcon(link.platform)}
                              </div>
                              <div>
                                <div className="font-medium capitalize text-gray-900">{link.platform}</div>
                                <div className="text-xs text-gray-500 truncate max-w-[180px]">{link.url}</div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
          
          {/* Actions footer - only show for current user */}
          {isCurrentUser && (
            <CardFooter className="px-6 py-4 border-t bg-gray-50">
              <div className="w-full flex flex-wrap justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/profile/${profile.id}/edit`)}
                  className="flex-1 border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/5"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button 
                  variant="ghost" 
                  className="flex-1 text-red-500 hover:text-red-700 hover:bg-red-50" 
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </main>
  )
}

function ProfileSkeleton() {
  return (
    <div>
      {/* Hero skeleton */}
      <div className="w-full h-64 md:h-80 bg-gray-200 animate-pulse"></div>
      
      <div className="container max-w-5xl px-4 sm:px-6 -mt-24 relative z-10">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Avatar and header skeleton */}
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
              <div className="relative -mt-20">
                <div className="h-32 w-32 rounded-full bg-gray-200 border-4 border-white"></div>
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-gray-200 rounded-md w-48"></div>
                <div className="flex flex-wrap gap-3">
                  <div className="h-4 bg-gray-200 rounded-md w-36"></div>
                  <div className="h-4 bg-gray-200 rounded-md w-40"></div>
                </div>
              </div>
            </div>
            
            {/* Bio skeleton */}
            <div className="mt-6 space-y-2">
              <div className="h-4 bg-gray-200 rounded-md w-full"></div>
              <div className="h-4 bg-gray-200 rounded-md w-3/4"></div>
            </div>
            
            {/* Stats skeleton */}
            <div className="flex gap-6 mt-6 pb-6 border-b">
              <div className="flex flex-col items-center">
                <div className="h-6 bg-gray-200 rounded-md w-12 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded-md w-16"></div>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-6 bg-gray-200 rounded-md w-12 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded-md w-16"></div>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-6 bg-gray-200 rounded-md w-12 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded-md w-16"></div>
              </div>
            </div>
          </div>
          
          {/* Tabs skeleton */}
          <div className="px-6 border-b">
            <div className="flex gap-4 py-3">
              <div className="h-5 bg-gray-200 rounded-md w-16"></div>
              <div className="h-5 bg-gray-200 rounded-md w-16"></div>
              <div className="h-5 bg-gray-200 rounded-md w-16"></div>
            </div>
          </div>
          
          {/* Content skeleton */}
          <div className="p-6 space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded-md w-[200px]"></div>
                    <div className="h-3 bg-gray-200 rounded-md w-[150px]"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded-md w-full"></div>
                <div className="h-4 bg-gray-200 rounded-md w-full"></div>
                <div className="h-[200px] bg-gray-200 rounded-md w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}