"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import FeedPost from "@/components/feed/feed-post"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { getFeedPosts } from "@/app/actions"
import { toast } from "sonner"
import type { Post } from "@/types/feed"
import { Camera, MapPin, Star } from "lucide-react"
import Image from "next/image"
import CreatePostForm from "../post/create-post-form"

interface ProfileContentProps {
  userId: string
}

export default function ProfileContent({ userId }: ProfileContentProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar?: string } | null>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)

  useEffect(() => {
    loadUserPosts()

    // Fetch current user to check if this is the user's own profile
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })
        const data = await response.json()
        if (data?.user) {
          setCurrentUser(data.user)
          setIsOwnProfile(data.user.id === userId)
        }
      } catch (error) {
        console.error("Error fetching current user:", error)
      }
    }

    fetchCurrentUser()
  }, [userId])

  const loadUserPosts = async () => {
    setIsLoading(true)
    try {
      // In a real app, fetch user posts from API
      const userPosts = await getFeedPosts("user", "recent", 1)
      setPosts(userPosts.filter((post) => post.author.id === userId))
    } catch (error) {
      console.error("Error loading user posts:", error)
      toast.error("Failed to load user posts")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mt-6 space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-6">
      <Tabs defaultValue="posts">
        <TabsContent value="posts" className="mt-0 space-y-4">
          {/* Show create post form only if this is the user's own profile */}
          {isOwnProfile && currentUser && (
            <CreatePostForm/>
          )}

          {posts.filter((post) => post.type === "post").length > 0 ? (
            posts.filter((post) => post.type === "post").map((post) => <FeedPost key={post.id} post={post} />)
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Camera className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No posts yet</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {isOwnProfile
                    ? "You haven't shared any posts yet. Create your first post now!"
                    : "This user hasn't shared any posts yet. Check back later!"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Rest of the tabs remain unchanged */}
        <TabsContent value="reviews" className="mt-0 space-y-4">
          {posts.filter((post) => post.type === "review").length > 0 ? (
            posts.filter((post) => post.type === "review").map((post) => <FeedPost key={post.id} post={post} />)
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {isOwnProfile
                    ? "You haven't written any reviews yet. Share your experiences!"
                    : "This user hasn't written any reviews yet. Check back later!"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="photos" className="mt-0">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {posts.filter((post) => post.image).length > 0 ? (
                  posts
                    .filter((post) => post.image)
                    .map((post, index) => (
                      <div key={index} className="aspect-square relative rounded-md overflow-hidden">
                        <Image
                          src={post.image || "/placeholder.svg?height=200&width=200&query=photo"}
                          alt={`Photo ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))
                ) : (
                  <div className="col-span-full p-12 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <Camera className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No photos yet</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      {isOwnProfile
                        ? "You haven't shared any photos yet. Add photos to your posts!"
                        : "This user hasn't shared any photos yet. Check back later!"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="mt-0">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">About</h3>
                  <p className="text-gray-700">
                    Food enthusiast and travel blogger. Always on the lookout for hidden gems and local favorites. I
                    love sharing my experiences and connecting with like-minded explorers.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Favorite Places</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">The Secret Garden Café</p>
                        <p className="text-xs text-gray-500">Brooklyn, NY</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Sunset Point Park</p>
                        <p className="text-xs text-gray-500">Manhattan, NY</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-500 mr-3 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Napoli&apos;s Pizzeria</p>
                        <p className="text-xs text-gray-500">Queens, NY</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Stats</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-[#FF6B6B]">42</p>
                      <p className="text-sm text-gray-500">Posts</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-[#FF6B6B]">156</p>
                      <p className="text-sm text-gray-500">Reviews</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-[#FF6B6B]">1.2k</p>
                      <p className="text-sm text-gray-500">Followers</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-[#FF6B6B]">567</p>
                      <p className="text-sm text-gray-500">Following</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
