"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { UserPlus, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useFollow } from "@/hooks/use-follow"

interface Follower {
  id: string
  name: string
  email: string
  profileImage: any
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

  const handleFollowToggle = async (followerId: string, isFollowing: boolean) => {
    if (!currentUser?.id) return

    // Prevent self-following
    if (followerId === currentUser.id) {
      toast.error("You cannot follow yourself")
      return
    }

    try {
      const response = await fetch('/api/users/follow', {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId: followerId }),
      })

      if (response.ok) {
        toast.success(isFollowing ? "User unfollowed" : "User followed")
        
        // Clear cache to ensure fresh data
        if (typeof globalThis !== 'undefined' && globalThis._followCache) {
          globalThis._followCache.delete(`followers-${followerId}`)
          globalThis._followCache.delete(`following-${followerId}`)
          globalThis._followCache.delete(`followers-${currentUser.id}`)
          globalThis._followCache.delete(`following-${currentUser.id}`)
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${isFollowing ? 'unfollow' : 'follow'}`)
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
      if (error instanceof Error && error.message === 'Users cannot follow themselves') {
        toast.error("You cannot follow yourself")
      } else {
        toast.error("Failed to update follow status")
      }
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Followers ({followers.length})</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {followers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No followers yet</p>
          ) : (
            followers.map((follower) => (
              <div key={follower.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    {follower.profileImage?.url ? (
                      <AvatarImage src={follower.profileImage.url} alt={follower.name} />
                    ) : (
                      <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B]">
                        {getInitials(follower.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium">{follower.name}</p>
                    <p className="text-sm text-gray-500">{follower.email}</p>
                  </div>
                </div>
                
                {currentUser && follower.id !== currentUser.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFollowToggle(follower.id, false)}
                    className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Follow
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 