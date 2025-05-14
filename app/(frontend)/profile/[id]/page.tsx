/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Mail,
  MapPin,
  Loader2,
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
  Users,
  UserPlus,
  UserCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { followUser, unfollowUser, getFeedPostsByUser, getUserbyId, getFollowers, getFollowing } from "@/app/actions"
import FeedPost from "@/components/feed/feed-post"
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
            console.log("Current user:", currentUser)
            
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
  
            if(followers.map((follower: any) => follower.id).includes(currentUser.id as string)) {
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
  }, [userId])

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
            image: post.image?.url || post.featuredImage?.url || null,
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
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
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
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#FF6B6B] mx-auto mb-4" />
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    )
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
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header with back button */}
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-[#FF6B6B]" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      {/* Profile header card */}
      <div className="relative mb-8 rounded-xl overflow-hidden">
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

                {!isCurrentUser && (
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    onClick={handleFollowToggle}
                    disabled={isProcessingFollow}
                    className={
                      isFollowing
                        ? "border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                        : "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
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
                  <span className="text-sm font-medium">{followers.length || 0}</span>
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

      {/* Tabs for different sections */}
      <Tabs defaultValue="posts" className="mb-8">
        <TabsList className="mb-6">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          {profile.interests && profile.interests.length > 0 && <TabsTrigger value="interests">Interests</TabsTrigger>}
          {profile.isCreator && <TabsTrigger value="creator">Creator Info</TabsTrigger>}
        </TabsList>

        <TabsContent value="posts">
          <div className="space-y-4">
            {isLoadingPosts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF6B6B]" />
              </div>
            ) : userPosts.length > 0 ? (
              userPosts.map((post) => <FeedPost key={post.id} post={post} />)
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Camera className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No posts yet</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    {isCurrentUser
                      ? "You haven't shared any posts yet. Start sharing your experiences!"
                      : "This user hasn't shared any posts yet. Check back later!"}
                  </p>
                  {isCurrentUser && (
                    <Button className="mt-4 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">Create Your First Post</Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>About {profile.name || "User"}</CardTitle>
              <CardDescription>Personal information and details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Contact</h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-700">
                      <Mail className="h-5 w-5 mr-2 text-[#FF6B6B]" />
                      <span>{profile.email}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Location</h3>
                  <div className="space-y-2">
                    {profile.location ? (
                      <div className="flex items-start text-gray-700">
                        <MapPin className="h-5 w-5 mr-2 text-[#FF6B6B] mt-0.5" />
                        <div>
                          {profile.location.city && <div>{profile.location.city}</div>}
                          {profile.location.state && <div>{profile.location.state}</div>}
                          {profile.location.country && <div>{profile.location.country}</div>}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500">No location provided</div>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <h3 className="text-lg font-medium mb-2">Bio</h3>
                {profile.bio ? (
                  <p className="text-gray-700">{profile.bio}</p>
                ) : (
                  <p className="text-gray-500">No bio provided</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {profile.interests && profile.interests.length > 0 && (
          <TabsContent value="interests">
            <Card>
              <CardHeader>
                <CardTitle>Interests</CardTitle>
                <CardDescription>Things {profile.name || "this user"} is interested in</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((item, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
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
          <TabsContent value="creator">
            <Card>
              <CardHeader>
                <CardTitle>Creator Profile</CardTitle>
                <CardDescription>Information about {profile.name || "this user"} as a creator</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="flex items-center mb-2">
                    <Award className="h-5 w-5 mr-2 text-[#FF6B6B]" />
                    <h3 className="text-lg font-medium">{creatorLevel.title}</h3>
                  </div>
                  <p className="text-gray-700 mb-3">{creatorLevel.description}</p>
                  <div className="w-full">
                    <Progress value={creatorLevel.progress} className="h-2" />
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>Explorer</span>
                      <span>Hunter</span>
                      <span>Authority</span>
                      <span>Expert</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="text-lg font-medium mb-3">Connect with {profile.name || "this creator"}</h3>
                  {profile.socialLinks && profile.socialLinks.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {profile.socialLinks.map((link, index) => (
                        <a
                          key={index}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-[#FF6B6B] hover:bg-[#FF6B6B]/5 transition-colors"
                        >
                          <div className="h-8 w-8 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center mr-3">
                            {getSocialIcon(link.platform)}
                          </div>
                          <div>
                            <div className="font-medium capitalize">{link.platform}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[150px]">{link.url}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No social links provided</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Actions footer - only show for current user */}
      {isCurrentUser && (
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => router.push("/profile/edit")}
            className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/5"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
          <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </div>
      )}
    </div>
  )
}
