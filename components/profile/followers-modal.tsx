"use client"

import { useState, useEffect } from "react"
import { X, Users, UserPlus, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

import { useAuth } from "@/hooks/use-auth"
import { getImageUrl } from "@/lib/image-utils"
import Link from "next/link"

interface Follower {
  id: string
  name: string
  username?: string
  email: string
  profileImage?: {
    url: string
  } | null
  bio?: string
  isVerified?: boolean
  followerCount?: number
}

interface FollowersModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  followers: Follower[]
  onFollowersUpdate: (followers: Follower[]) => void
}

export default function FollowersModal({
  isOpen,
  onClose,
  userId,
  followers,
  onFollowersUpdate
}: FollowersModalProps) {
  const { user: currentUser } = useAuth()
  const [isProcessingFollow, setIsProcessingFollow] = useState<string | null>(null)

  const handleFollowToggle = async (followerId: string, isFollowing: boolean) => {
    if (!currentUser?.id || isProcessingFollow) return

    // Prevent self-following
    if (followerId === currentUser.id) {
      toast.error("You cannot follow yourself")
      return
    }

    setIsProcessingFollow(followerId)
    try {
      if (isFollowing) {
        const response = await fetch('/api/users/follow', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ userId: followerId }),
        })

        if (response.ok) {
          toast.success("User unfollowed")
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
          body: JSON.stringify({ userId: followerId }),
        })

        if (response.ok) {
          toast.success("User followed")
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to follow')
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
      if (error instanceof Error && error.message === 'Users cannot follow themselves') {
        toast.error("You cannot follow yourself")
      } else {
        toast.error("Failed to update follow status")
      }
    } finally {
      setIsProcessingFollow(null)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getProfileImageUrl = (profileImage: any) => {
    if (!profileImage) return "/placeholder.svg"
    const imageUrl = getImageUrl(profileImage)
    return imageUrl !== "/placeholder.svg" ? imageUrl : "/placeholder.svg"
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#FF6B6B]" />
            Followers ({followers.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="max-h-[60vh] overflow-y-auto">
            {followers.length === 0 ? (
              <div className="p-6 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No followers yet
                </h3>
                <p className="text-gray-500">
                  When people follow this user, they'll appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {followers.map((follower) => (
                  <div key={follower.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Link href={`/profile/${follower.id}`} onClick={onClose}>
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                            {follower.profileImage ? (
                              <AvatarImage 
                                src={getProfileImageUrl(follower.profileImage)} 
                                alt={follower.name} 
                              />
                            ) : (
                              <AvatarFallback className="bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] text-white text-sm font-bold">
                                {getInitials(follower.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </Link>
                        
                        <div className="flex-1 min-w-0">
                          <Link href={`/profile/${follower.id}`} onClick={onClose}>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {follower.name}
                              </h4>
                              {follower.isVerified && (
                                <Badge variant="secondary" className="px-1 py-0 text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  ✓
                                </Badge>
                              )}
                            </div>
                          </Link>
                          
                          {follower.username && (
                            <p className="text-sm text-gray-500 truncate">
                              @{follower.username}
                            </p>
                          )}
                          
                          {follower.bio && (
                            <p className="text-sm text-gray-600 truncate mt-1">
                              {follower.bio}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {currentUser?.id && currentUser.id !== follower.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFollowToggle(follower.id, false)} // Assuming we don't know if following
                          disabled={isProcessingFollow === follower.id}
                          className="ml-3 flex-shrink-0"
                        >
                          {isProcessingFollow === follower.id ? (
                            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" />
                              Follow
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 