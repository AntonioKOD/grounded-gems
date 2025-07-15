"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, MapPin, Star, X, ChevronRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import Link from 'next/link'
import type { PeopleSuggestionItem } from '@/types/feed'
import { getImageUrl } from '@/lib/image-utils'

interface PeopleSuggestionCardProps {
  item: PeopleSuggestionItem
  onDismiss?: () => void
  className?: string
}

export default function PeopleSuggestionCard({
  item,
  onDismiss,
  className = ""
}: PeopleSuggestionCardProps) {
  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDismiss?.()
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getUserProfileImageUrl = (user: any) => {
    if (!user) return "/placeholder.svg"
    const profileImageUrl = getImageUrl(user.avatar)
    return profileImageUrl !== "/placeholder.svg" ? profileImageUrl : "/placeholder.svg"
  }

  // If no people data, don't render
  if (!item.people) {
    console.warn('No people data in suggestion item:', item)
    return null
  }

  const user = item.people

  return (
    <Card className={`overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#4ECDC4] to-[#FF6B6B] rounded-full">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">People to Follow</h3>
              <p className="text-sm text-gray-600">Connect with amazing local explorers</p>
            </div>
          </div>
          
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8 rounded-full hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link href={`/profile/${user.id}`} className="block group">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white hover:bg-gray-50/50 transition-all duration-300 border border-gray-100 group-hover:border-[#4ECDC4]/30 group-hover:shadow-sm">
              {/* Avatar with gradient ring */}
              <div className="relative w-14 h-14 flex-shrink-0">
                <div className="absolute inset-0 w-14 h-14 rounded-full bg-gradient-to-tr from-[#4ECDC4] via-[#FF6B6B] to-[#FFE66D] p-[2px]">
                  <div className="w-full h-full rounded-full bg-white p-[2px]">
                    <Avatar className="h-full w-full">
                      <AvatarImage 
                        src={getUserProfileImageUrl(user)} 
                        alt={user.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-[#4ECDC4] to-[#FF6B6B] text-white font-bold">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                
                {/* Online indicator with proper positioning */}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm z-10" />
              </div>

              {/* User info with proper spacing and overflow handling */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-semibold text-gray-900 truncate group-hover:text-[#FF6B6B] transition-colors">
                    {user.name}
                  </h4>
                  {user.mutualConnections && user.mutualConnections > 0 && (
                    <Badge variant="secondary" className="text-xs bg-[#4ECDC4]/10 text-[#4ECDC4] border-[#4ECDC4]/20 flex-shrink-0">
                      {user.mutualConnections} mutual
                    </Badge>
                  )}
                  {user.verified && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 flex-shrink-0">
                      ✓
                    </Badge>
                  )}
                </div>
                
                {/* Username */}
                {user.username && (
                  <p className="text-sm text-gray-500 line-clamp-1 mb-2">
                    @{user.username}
                  </p>
                )}
                
                {/* Bio - only show if it exists and is meaningful */}
                {user.bio && user.bio.trim().length > 0 && (
                  <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                    {user.bio}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {user.followersCount > 0 && (
                    <span>{user.followersCount} followers</span>
                  )}
                  {user.postsCount > 0 && (
                    <span>{user.postsCount} posts</span>
                  )}
                </div>
              </div>

              {/* Profile link indicator */}
              <div className="flex-shrink-0">
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#4ECDC4] transition-colors" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* View all button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Link href="/search">
            <Button 
              variant="ghost" 
              className="w-full mt-4 text-[#4ECDC4] hover:text-[#4ECDC4]/80 hover:bg-[#4ECDC4]/10 rounded-xl font-semibold group"
            >
              Discover More People
              <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </CardContent>
    </Card>
  )
} 