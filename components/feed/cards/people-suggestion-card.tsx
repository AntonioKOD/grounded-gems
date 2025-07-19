"use client"

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Users, MapPin, Star, X, ChevronRight, Calendar, Award, Clock } from 'lucide-react'
import { PeopleSuggestionItem } from '@/types/feed'
import { toast } from 'sonner'

interface PeopleSuggestionCardProps {
  item: PeopleSuggestionItem
}

export default function PeopleSuggestionCard({ item }: PeopleSuggestionCardProps) {
  const { people: user } = item
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleFollowToggle = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/users/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      })

      if (response.ok) {
        setIsFollowing(!isFollowing)
        toast.success(isFollowing ? 'Unfollowed' : 'Following')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to follow user')
      }
    } catch (error) {
      toast.error('Failed to follow user')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const getCreatorLevelColor = (level?: string) => {
    switch (level) {
      case 'expert': return 'bg-purple-500'
      case 'authority': return 'bg-blue-500'
      case 'hunter': return 'bg-green-500'
      case 'explorer': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-white to-gray-50/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
              <AvatarImage src={user.avatar || undefined} alt={user.name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            {user.verified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                <Star className="h-3 w-3 text-white fill-current" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{user.name}</h3>
                  {user.isCreator && (
                    <Badge 
                      variant="secondary" 
                      className={`${getCreatorLevelColor(user.creatorLevel)} text-white text-xs px-2 py-0.5`}
                    >
                      <Award className="h-3 w-3 mr-1" />
                      {user.creatorLevel || 'Creator'}
                    </Badge>
                  )}
                </div>
                
                {/* Location */}
                {user.location && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <MapPin className="h-3 w-3" />
                    <span>{user.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{user.bio}</p>
            )}

            {/* Stats Row */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
              {user.followersCount > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {user.followersCount}
                </span>
              )}
              {user.postsCount > 0 && (
                <span>{user.postsCount} posts</span>
              )}
              {user.mutualConnections > 0 && (
                <span className="text-blue-600 font-medium">
                  {user.mutualConnections} mutual
                </span>
              )}
              {user.averageRating && user.averageRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span>{user.averageRating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Follow Button */}
            <Button
              onClick={handleFollowToggle}
              disabled={isLoading}
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isFollowing ? 'Unfollowing...' : 'Following...'}
                </div>
              ) : (
                <span>{isFollowing ? 'Following' : 'Follow'}</span>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 