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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { followUser, unfollowUser, getFeedPostsByUser, getFollowers, getFollowing, getUserbyId } from "@/app/actions"
import { PostCard } from "@/components/post/post-card"
import type { Post } from "@/types/feed"
import { useAuth } from "@/hooks/use-auth"
import ProfileSkeleton from "./profile-skeleton"
import PostsSkeleton from "@/components/feed/posts-skeleton"
import type { UserProfile } from "@/types/user"
import Link from "next/link"
import ResponsiveFeed from "@/components/feed/responsive-feed"

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
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("posts")
  const [hasLoadedPosts, setHasLoadedPosts] = useState(false)

  // Helper function to normalize post data
  const normalizePost = useCallback((post: any): any => {
    // Ensure image is a valid non-empty string or null
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

      // Check if current user is following this profile
      if (followers.length > 0) {
        setIsFollowing(followers.some((follower) => follower.id === currentUser.id))
      }
    }
  }, [currentUser, profile, followers])

  // Fetch profile data if not provided or incomplete
  useEffect(() => {
    const fetchProfileData = async () => {
      if (initialUserData) return // Skip if we already have data

      setIsLoading(true)
      setError(null)

      try {
        // Fetch profile data
        const userData = await getUserbyId(userId)

        if (!userData) {
          setError("Could not load this profile. It may not exist or you may not have permission to view it.")
          return
        }

        // Map the response to match UserProfile type
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
        // Fetch in parallel
        const [followersData, followingData] = await Promise.all([getFollowers(profile.id), getFollowing(profile.id)])

        setFollowers(followersData || [])
        setFollowing(followingData || [])

        // Check if current user is following this profile
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

        // Map the posts to match the expected format
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
    if (isProcessingFollow || !profile || !currentUser?.id) return

    setIsProcessingFollow(true)
    try {
      if (isFollowing) {
        await unfollowUser(profile.id, currentUser.id)
        toast.success(`Unfollowed ${profile.name || "user"}`)

        // Update follower count
        setProfile((prev: UserProfile | null) =>
          prev
            ? {
                ...prev,
                followerCount: Math.max(0, (prev.followerCount || 1) - 1),
              }
            : null
        )

        // Update followers list
        setFollowers((prev) => prev.filter((follower) => follower.id !== currentUser.id))
      } else {
        await followUser(profile.id, currentUser.id)
        toast.success(`Now following ${profile.name || "user"}`)

        // Update follower count
        setProfile((prev: UserProfile | null) =>
          prev
            ? {
                ...prev,
                followerCount: (prev.followerCount || 0) + 1,
              }
            : null,
        )

        // Update followers list
        setFollowers((prev) => [...prev, { id: currentUser.id, name: currentUser.name }])
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

  // Get social icon - memoized to prevent re-renders
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
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle className="text-lg font-semibold">Profile Not Available</AlertTitle>
          <AlertDescription className="mt-2">{error}</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={() => router.push("/")} className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white">
            Return Home
          </Button>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const creatorLevel = getCreatorLevelDetails(profile.creatorLevel)

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
              asChild
            >
              <Link href={`/profile/${profile.id}/location-dashboard`}>
                <MapPin className="h-4 w-4 mr-1" />
                Locations
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/90 hover:bg-white border-0 shadow-sm"
              onClick={() => router.push(`/profile/${profile.id}/edit`)}
            >
              <Edit3 className="h-4 w-4 mr-1" />
              Edit Profile
            </Button>
            <Button variant="outline" size="sm" className="bg-white/90 hover:bg-white border-0 shadow-sm">
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
                  <span className="text-2xl font-bold text-gray-900">
                    {followers.length || profile.followerCount || 0}
                  </span>
                  <span className="text-sm text-gray-500">Followers</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {following.length || profile.followingCount || 0}
                  </span>
                  <span className="text-sm text-gray-500">Following</span>
                </div>

                {/* Social links */}
                {profile.socialLinks && profile.socialLinks.length > 0 && (
                  <div className="ml-auto flex flex-wrap gap-2 items-center">
                    {profile.socialLinks.map((link: { url: string | undefined; platform: string | undefined }, index: Key | null | undefined) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                        title={link.platform}
                      >
                        {getSocialIcon(link.platform || 'website')}
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

              <TabsContent value="posts">
                <Suspense fallback={<PostsSkeleton />}>
                  <ResponsiveFeed
                    initialPosts={userPosts}
                    feedType="user"
                    userId={userId}
                    showPostForm={isCurrentUser}
                  />
                </Suspense>
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
                              {profile.location.state && (
                                <span className="text-gray-800">{profile.location.state}</span>
                              )}
                              {profile.location.country && (
                                <span className="text-gray-800">{profile.location.country}</span>
                              )}
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
                        {profile.interests.map((item: { interest: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined }, index: Key | null | undefined) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="px-3 py-1 bg-[#FF6B6B]/10 text-[#FF6B6B] border-0"
                          >
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
                          {profile.socialLinks.map((link: { url: string; platform: string }, index: Key | null | undefined) => (
                            <Link
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
                            </Link>
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
