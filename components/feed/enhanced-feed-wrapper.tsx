"use client"

import { useAppSelector } from '@/lib/hooks'
import EnhancedFeedContainer from './enhanced-feed-container'
import type { FeedContentType } from '@/types/feed'

interface EnhancedFeedWrapperProps {
  preferences?: {
    interests: string[]
    contentTypes: FeedContentType[]
    feedStyle: 'chronological' | 'algorithmic' | 'mixed'
  }
  className?: string
}

export default function EnhancedFeedWrapper({
  preferences,
  className
}: EnhancedFeedWrapperProps) {
  const { user, isLoading } = useAppSelector((state) => state.user)

  // Don't render until we have user state resolved (either user or null)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
                <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <EnhancedFeedContainer
      userId={user?.id}
      user={user && user.id ? {
        id: user.id,
        name: user.name || '',
        avatar: user.profileImage?.url || user.avatar,
        profileImage: user.profileImage
      } : null}
      preferences={preferences}
      className={className}
    />
  )
} 