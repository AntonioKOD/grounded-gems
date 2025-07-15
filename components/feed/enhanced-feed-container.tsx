"use client"

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Filter, TrendingUp, Calendar, Users, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
// import { useFeedStore } from '@/lib/features/feed/feedSlice'

// Import our new card components
import PeopleSuggestionCard from './cards/people-suggestion-card'
import PlaceRecommendationCard from './cards/place-recommendation-card'
import WeeklyFeatureCard from './cards/weekly-feature-card'

// Import existing components
import FeedPost from './feed-post'
import FeedSkeleton from './feed-skeleton'
import FeedErrorState from './feed-error-state'
import EmptyFeed from './empty-feed'

// Import weekly challenges components
import ChallengeCard from '../challenges/challenge-card'
import ChallengeSuggestionCard from '../challenges/challenge-suggestion-card'

import type { 
  FeedItem, 
  FeedContentType,
  PostFeedItem,
  PeopleSuggestionItem,
  PlaceRecommendationItem,
  GuideSpotlightItem,
  WeeklyFeatureItem
} from '@/types/feed'

interface EnhancedFeedContainerProps {
  userId?: string
  location?: { latitude: number; longitude: number }
  preferences?: {
    interests: string[]
    contentTypes: FeedContentType[]
    feedStyle: 'chronological' | 'algorithmic' | 'mixed'
  }
  user: {
    id: string
    name: string
    avatar?: string
    profileImage?: {
      url: string
    }
  } | null
  className?: string
}

export default function EnhancedFeedContainer({
  userId,
  location,
  preferences,
  user,
  className = ""
}: EnhancedFeedContainerProps) {
  // All hooks must be called at the top level, before any conditional returns
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [activeFilters, setActiveFilters] = useState<FeedContentType[]>([])
  const [weeklyFeature, setWeeklyFeature] = useState<any>(null)
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false)
  const [weeklyChallenges, setWeeklyChallenges] = useState<any>(null)
  const [isLoadingWeeklyChallenges, setIsLoadingWeeklyChallenges] = useState(false)

  // Content type filters - redesigned for better UX
  const contentTypeFilters = [
    { type: 'post' as FeedContentType, label: 'Posts', icon: TrendingUp, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200', description: 'Community posts and reviews' },
    { type: 'people_suggestion' as FeedContentType, label: 'People', icon: Users, color: 'bg-purple-100 text-purple-700 hover:bg-purple-200', description: 'Discover new creators' },
    { type: 'place_recommendation' as FeedContentType, label: 'Places', icon: MapPin, color: 'bg-green-100 text-green-700 hover:bg-green-200', description: 'Hidden gems & recommendations' },
  ]

  const fetchFeedItems = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true)
      } else if (pageNum === 1) {
        setIsLoading(true)
      }

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        userId: userId || user?.id || '',
        feedStyle: preferences?.feedStyle || 'mixed'
      })

      // Add location if available
      if (location) {
        params.append('lat', location.latitude.toString())
        params.append('lng', location.longitude.toString())
      }

      // Handle content type filters properly
      if (activeFilters.length > 0) {
        // When filters are active, only show those types
        params.append('includeTypes', activeFilters.join(','))
      } else {
        // When no filters are active, show all types (don't add any filter params)
        // This ensures we get the default algorithm mix
      }

      // Add user interests
      if (preferences?.interests && Array.isArray(preferences.interests) && preferences.interests.length > 0) {
        params.append('interests', preferences.interests.join(','))
      }

      // Add sort by parameter
      const sortBy = (activeFilters as any).includes('trending') ? 'popular' : 
                    (activeFilters as any).includes('recent') ? 'recent' : 'recommended'
      params.append('sortBy', sortBy)

      // Add feed type
      const feedType = preferences?.feedStyle === 'chronological' ? 'chronological' : 
                      preferences?.feedStyle === 'algorithmic' ? 'algorithmic' : 'mixed'
      params.append('feedType', feedType)

      console.log('🔍 Fetching feed with params:', Object.fromEntries(params))

      const response = await fetch(`/api/feed/enhanced?${params}`)
      
      if (!response.ok) {
        // Check for specific database connection errors
        if (response.status === 500) {
          const errorText = await response.text()
          if (errorText.includes('MongoDB') || errorText.includes('database')) {
            throw new Error('Database connection error. Please check your connection and try again.')
          }
        }
        throw new Error(`Failed to fetch feed (${response.status})`)
      }

      const data = await response.json()
      
      // Safely access response data
      const items = data?.data?.items || data?.items || []
      const hasMoreData = data?.data?.pagination?.hasMore ?? data?.hasMore ?? false
      
      console.log('📦 Received feed items:', {
        total: items.length,
        types: items.reduce((acc: Record<string, number>, item: FeedItem) => {
          acc[item.type] = (acc[item.type] || 0) + 1
          return acc
        }, {}),
        activeFilters,
        hasMore: hasMoreData,
        sampleItems: items.slice(0, 2).map((item: FeedItem) => ({
          id: item.id,
          type: item.type,
          hasPlaceData: item.type === 'place_recommendation' ? !!item.place : 'N/A',
          hasPeopleData: item.type === 'people_suggestion' ? !!item.people : 'N/A',
          hasFeatureData: item.type === 'weekly_feature' ? !!item.feature : 'N/A',
          hasPostData: item.type === 'post' ? !!item.post : 'N/A'
        }))
      })
      
      if (refresh || pageNum === 1) {
        setFeedItems(items)
      } else {
        setFeedItems(prev => [...prev, ...items])
      }
      
      setHasMore(hasMoreData)
      setPage(pageNum)
      setError(null)
      
    } catch (error) {
      console.error('Error fetching feed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load feed'
      
      // Set user-friendly error messages
      if (errorMessage.includes('Database connection') || errorMessage.includes('MongoDB')) {
        setError('Unable to connect to the database. Please check your internet connection and try again.')
      } else if (errorMessage.includes('Failed to fetch feed (500)')) {
        setError('Server error. Our team has been notified and is working on a fix.')
      } else {
        setError(errorMessage)
      }
      
      if (pageNum === 1) {
        setFeedItems([])
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [userId, location, preferences, activeFilters, user?.id])

  // Add useEffect to refetch when filters change
  useEffect(() => {
    console.log('🔄 Active filters changed:', activeFilters)
    
    // Create a new function to avoid circular dependency
    const refetchWithFilters = async () => {
      try {
        setIsRefreshing(true)

        const params = new URLSearchParams({
          page: '1',
          limit: '20',
          userId: userId || user?.id || '',
          feedStyle: preferences?.feedStyle || 'mixed'
        })

        // Add location if available
        if (location) {
          params.append('lat', location.latitude.toString())
          params.append('lng', location.longitude.toString())
        }

        // Handle content type filters properly
        if (activeFilters.length > 0) {
          params.append('includeTypes', activeFilters.join(','))
        }

        // Add user interests
        if (preferences?.interests && Array.isArray(preferences.interests) && preferences.interests.length > 0) {
          params.append('interests', preferences.interests.join(','))
        }

        // Add sort by parameter
        const sortBy = (activeFilters as any).includes('trending') ? 'popular' : 
                      (activeFilters as any).includes('recent') ? 'recent' : 'recommended'
        params.append('sortBy', sortBy)

        // Add feed type
        const feedType = preferences?.feedStyle === 'chronological' ? 'chronological' : 
                        preferences?.feedStyle === 'algorithmic' ? 'algorithmic' : 'mixed'
        params.append('feedType', feedType)

        console.log('🔍 Fetching feed with new filters:', Object.fromEntries(params))

        const response = await fetch(`/api/feed/enhanced?${params}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch feed (${response.status})`)
        }

        const data = await response.json()
        const items = data?.data?.items || data?.items || []
        const hasMoreData = data?.data?.pagination?.hasMore ?? data?.hasMore ?? false
        
        setFeedItems(items)
        setHasMore(hasMoreData)
        setPage(1)
        setError(null)
        
      } catch (error) {
        console.error('Error refetching with filters:', error)
        setError('Failed to update feed with new filters')
      } finally {
        setIsRefreshing(false)
      }
    }

    refetchWithFilters()
  }, [activeFilters, userId, location, preferences, user?.id])

  // Initial load
  useEffect(() => {
    fetchFeedItems(1, false)
  }, [fetchFeedItems])

  // Now we can have conditional returns after all hooks are called
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Loading skeleton
  if (isLoading && feedItems.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Feed</h2>
          <div className="flex space-x-2">
            {contentTypeFilters.map((filter) => (
              <div key={filter.type} className="h-8 bg-gray-200 rounded-full w-20"></div>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
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

  // Rest of the component logic...
  const handleRefresh = () => {
    fetchFeedItems(1, true)
  }

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchFeedItems(page + 1, false)
    }
  }

  const handleFilterToggle = (contentType: FeedContentType) => {
    setActiveFilters(prev => {
      const isActive = prev.includes(contentType)
      if (isActive) {
        return prev.filter(type => type !== contentType)
      } else {
        return [...prev, contentType]
      }
    })
  }

  const handleShowAll = () => {
    setActiveFilters([])
  }

  const handleSavePlace = async (placeId: string) => {
    // Implementation for saving place
  }

  const handleLikeBlog = async (blogId: string) => {
    // Implementation for liking blog
  }

  const handleSaveBlog = async (blogId: string) => {
    // Implementation for saving blog
  }

  const handleDismissItem = (itemId: string) => {
    setFeedItems(prev => prev.filter(item => item.id !== itemId))
  }

  const loadWeeklyChallenges = async () => {
    try {
      setIsLoadingWeeklyChallenges(true)
      const response = await fetch('/api/challenges/weekly')
      if (response.ok) {
        const data = await response.json()
        setWeeklyChallenges(data)
      }
    } catch (error) {
      console.error('Error loading weekly challenges:', error)
    } finally {
      setIsLoadingWeeklyChallenges(false)
    }
  }

  const renderFeedItem = (item: FeedItem, index: number) => {

    switch (item.type) {
      case 'post':
        try {
          return (
            <FeedPost
              key={item.id}
              post={(item as any).post || (item as any)}
              user={user}
              className="animate-in slide-in-from-bottom-2 duration-300"
            />
          )
        } catch (error) {
          console.error('Error rendering FeedPost:', error)
          return (
            <div key={item.id} className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Error rendering post: {item.id}</p>
            </div>
          )
        }
      
      case 'people_suggestion':
        return (
          <PeopleSuggestionCard
            key={item.id}
            item={item as PeopleSuggestionItem}
            onDismiss={() => handleDismissItem(item.id)}
            className="animate-in slide-in-from-bottom-2 duration-300"
          />
        )
      
      case 'place_recommendation':
        return (
          <PlaceRecommendationCard
            key={item.id}
            item={item as PlaceRecommendationItem}
            onSave={() => handleSavePlace(item.id)}
            onDismiss={() => handleDismissItem(item.id)}
            className="animate-in slide-in-from-bottom-2 duration-300"
          />
        )
      
      case 'weekly_feature':
        // Hide weekly features for now
        return null
      
      case 'guide_spotlight':
        return (
          <div key={item.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Guide Spotlight</h3>
            <p className="text-gray-600">Guide content coming soon...</p>
          </div>
        )
      
      default:
        return (
          <div key={item.id} className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">Unknown content type: {item.type}</p>
          </div>
        )
    }
  }

  const renderWeeklyPage = () => {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Weekly Features</h3>
        <p>Weekly content coming soon...</p>
      </div>
    )
  }

  // Main render
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 ${className}`}>
      {/* Header with filters - Desktop */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Feed</h2>
              <p className="text-sm text-gray-600 mt-1">Discover amazing content from our community</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-gray-600 hover:text-gray-900"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Feed</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-gray-600 hover:text-gray-900"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {/* Filter Tabs - Responsive */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {/* Show All Button */}
            <button
              onClick={handleShowAll}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
                activeFilters.length === 0 
                  ? 'bg-gray-900 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            
            {/* Content Type Filters */}
            {contentTypeFilters.map((filter) => {
              const isActive = activeFilters.includes(filter.type)
              const IconComponent = filter.icon
              
              return (
                <button
                  key={filter.type}
                  onClick={() => handleFilterToggle(filter.type)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 flex-shrink-0 ${
                    isActive ? filter.color : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span className="hidden sm:inline">{filter.label}</span>
                  <span className="sm:hidden">{filter.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && feedItems.length === 0 && (
          <div className="space-y-6">
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
        )}

        {/* Feed items */}
        {feedItems.length > 0 && (
          <div className="space-y-6">
            {feedItems.map((item, index) => renderFeedItem(item, index))}
          </div>
        )}

        {/* Empty state */}
        {feedItems.length === 0 && !isLoading && !error && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-600 mb-6">Be the first to share something amazing!</p>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Create Your First Post
            </Button>
          </div>
        )}

        {/* Load more */}
        {hasMore && !isLoading && (
          <div className="text-center mt-8">
            <Button
              onClick={handleLoadMore}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 