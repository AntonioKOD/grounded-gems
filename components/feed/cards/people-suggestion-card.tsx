"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UserPlus, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useFollow } from "@/hooks/use-follow"

interface PeopleSuggestionCardProps {
  user: {
    id: string
    name: string
    email?: string
    profileImage?: any
    avatar?: string
    bio?: string
  }
}

export default function PeopleSuggestionCard({ user }: PeopleSuggestionCardProps) {
  const { user: currentUser } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)

  // Use the centralized follow hook
  const { isProcessing, handleFollowToggle } = useFollow({
    profileUserId: user.id,
    currentUserId: currentUser?.id,
    initialIsFollowing: isFollowing,
    onFollowStateChange: setIsFollowing
  })

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Use avatar if available, otherwise use profileImage
  const profileImageUrl = user.avatar || user.profileImage?.url

  return (
    <Card className="p-4">
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              {profileImageUrl ? (
                <AvatarImage src={profileImageUrl} alt={user.name} />
              ) : (
                <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B]">
                  {getInitials(user.name)}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h3 className="font-semibold">{user.name}</h3>
              {user.bio && (
                <p className="text-sm text-gray-500 truncate max-w-[200px]">
                  {user.bio}
                </p>
              )}
            </div>
          </div>
          
          {currentUser && currentUser.id !== user.id && (
            <Button
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              onClick={handleFollowToggle}
              disabled={isProcessing}
              className={
                isFollowing
                  ? "border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                  : "bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
              }
            >
              {isProcessing ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : isFollowing ? (
                <UserCheck className="h-4 w-4 mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              {isFollowing ? "Following" : "Follow"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 