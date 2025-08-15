"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { UserPlus, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"

interface Following {
  id: string
  name: string
  email: string
  profileImage: any
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

  const handleFollowToggle = async (followingId: string, isFollowing: boolean) => {
    if (!currentUser?.id) return

    // Prevent self-following
    if (followingId === currentUser.id) {
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
        body: JSON.stringify({ userId: followingId }),
      })

      if (response.ok) {
        toast.success(isFollowing ? "User unfollowed" : "User followed")
        
        // Remove from following list if unfollowing
        if (isFollowing) {
          onFollowingUpdate(following.filter(user => user.id !== followingId))
        }
        
        // Clear cache to ensure fresh data
        if (typeof globalThis !== 'undefined' && globalThis._followCache) {
          globalThis._followCache.delete(`followers-${followingId}`)
          globalThis._followCache.delete(`following-${followingId}`)
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
          <DialogTitle>Following ({following.length})</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {following.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Not following anyone yet</p>
          ) : (
            following.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    {user.profileImage?.url ? (
                      <AvatarImage src={user.profileImage.url} alt={user.name} />
                    ) : (
                      <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B]">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                
                {currentUser && user.id !== currentUser.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFollowToggle(user.id, true)}
                    className="border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Following
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