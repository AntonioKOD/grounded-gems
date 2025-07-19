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

interface Following {
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

interface FollowingModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  following: Following[]
  onFollowingUpdate: (following: Following[]) => void
}

export default function FollowingModal({
  isOpen,
  onClose,
  userId,
  following,
  onFollowingUpdate
}: FollowingModalProps) {
  const { user: currentUser } = useAuth()
  const [isProcessingFollow, setIsProcessingFollow] = useState<string | null>(null)

  const handleFollowToggle = async (followingId: string, isFollowing: boolean) => {
    if (!currentUser?.id || isProcessingFollow) return

    // Prevent self-following
    if (followingId === currentUser.id) {
      toast.error("You cannot follow yourself")
      return
    }

    setIsProcessingFollow(followingId)
    try {
      if (isFollowing) {
        const response = await fetch('/api/users/follow', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ userId: followingId }),
        })

        if (response.ok) {
          toast.success("User unfollowed")
          // Remove from following list
          onFollowingUpdate(following.filter(user => user.id !== followingId))
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
          body: JSON.stringify({ userId: followingId }),
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
            Following ({following.length})
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
            {following.length === 0 ? (
              <div className="p-6 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Not following anyone yet
                </h3>
                <p className="text-gray-500">
                  When this user follows people, they'll appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {following.map((user) => (
                  <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Link href={`/profile/${user.id}`} onClick={onClose}>
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                            {user.profileImage ? (
                              <AvatarImage 
                                src={getProfileImageUrl(user.profileImage)} 
                                alt={user.name} 
                              />
                            ) : (
                              <AvatarFallback className="bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] text-white text-sm font-bold">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </Link>
                        
                        <div className="flex-1 min-w-0">
                          <Link href={`/profile/${user.id}`} onClick={onClose}>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {user.name}
                              </h4>
                              {user.isVerified && (
                                <Badge variant="secondary" className="px-1 py-0 text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  ✓
                                </Badge>
                              )}
                            </div>
                          </Link>
                          
                          {user.username && (
                            <p className="text-sm text-gray-500 truncate">
                              @{user.username}
                            </p>
                          )}
                          
                          {user.bio && (
                            <p className="text-sm text-gray-600 truncate mt-1">
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {currentUser?.id && currentUser.id !== user.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFollowToggle(user.id, true)} // Assuming we're following them
                          disabled={isProcessingFollow === user.id}
                          className="ml-3 flex-shrink-0"
                        >
                          {isProcessingFollow === user.id ? (
                            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-1" />
                              Following
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