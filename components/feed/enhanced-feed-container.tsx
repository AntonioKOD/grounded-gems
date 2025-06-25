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
  // Guard clause: Don't render if user prop is null, undefined, or doesn't have an id
  // This prevents null reference errors during initial render
  if (!user || !user.id) {
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

  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [activeFilters, setActiveFilters] = useState<FeedContentType[]>([])
  const [weeklyFeature, setWeeklyFeature] = useState<any>(null)
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false)

  // Weekly challenges state
  const [weeklyChallenges, setWeeklyChallenges] = useState<any>(null)
  const [isLoadingWeeklyChallenges, setIsLoadingWeeklyChallenges] = useState(false)

  // Content type filters - removed stories section
  const contentTypeFilters = [
    { type: 'post' as FeedContentType, label: 'All Posts', icon: TrendingUp, color: 'bg-blue-100 text-blue-700', description: 'Community posts and reviews' },
    { type: 'people_suggestion' as FeedContentType, label: 'People', icon: Users, color: 'bg-purple-100 text-purple-700', description: 'Discover new creators' },
    { type: 'place_recommendation' as FeedContentType, label: 'Places', icon: MapPin, color: 'bg-green-100 text-green-700', description: 'Hidden gems & recommendations' },
    { type: 'weekly_feature' as FeedContentType, label: 'Weekly', icon: Calendar, color: 'bg-orange-100 text-orange-700', description: 'Curated weekly content' }
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
      const sortBy = activeFilters.includes('trending') ? 'popular' : 
                    activeFilters.includes('recent') ? 'recent' : 'recommended'
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
        hasMore: hasMoreData
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
        const sortBy = activeFilters.includes('trending') ? 'popular' : 
                      activeFilters.includes('recent') ? 'recent' : 'recommended'
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
        console.error('Error fetching feed with filters:', error)
        setError(error instanceof Error ? error.message : 'Failed to load feed')
      } finally {
        setIsRefreshing(false)
      }
    }
    
    refetchWithFilters()
  }, [activeFilters, userId, user?.id, location, preferences])

  // Add initial load useEffect - separate from filter changes
  useEffect(() => {
    console.log('🚀 Initial feed load')
    fetchFeedItems(1, true)
  }, []) // Empty dependency array for initial load only

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered')
    fetchFeedItems(1, true)
  }

  const handleLoadMore = () => {
    if (hasMore && !isLoading && !isRefreshing) {
      console.log('📄 Loading more content, page:', page + 1)
      fetchFeedItems(page + 1)
    }
  }

  const handleFilterToggle = (contentType: FeedContentType) => {
    console.log('🏷️ Filter toggle:', contentType)
    setActiveFilters(prev => {
      const newFilters = prev.includes(contentType)
        ? prev.filter(f => f !== contentType)
        : [contentType] // Only allow one filter at a time for weekly
      
      console.log('🏷️ New filters:', newFilters)
      
      // Reset page when filters change
      setPage(1)
      setHasMore(true)
      
      return newFilters
    })
  }

  // Add a "Show All" handler
  const handleShowAll = () => {
    console.log('🔄 Show all content triggered')
    setActiveFilters([])
    setPage(1)
    setHasMore(true)
  }

  const handleFollowUser = async (userId: string) => {
    // Update local state optimistically
    toast.success('Following user!')
  }

  const handleSavePlace = async (placeId: string) => {
    // Update local state optimistically
    toast.success('Place saved!')
  }

  const handleLikeBlog = async (blogId: string) => {
    // Update local state optimistically
    toast.success('Blog liked!')
  }

  const handleSaveBlog = async (blogId: string) => {
    // Update local state optimistically
    toast.success('Blog saved to reading list!')
  }

  const handleDismissItem = (itemId: string) => {
    setFeedItems(prev => prev.filter(item => item.id !== itemId))
    toast.success('Item dismissed')
  }

  // Load weekly challenges when weekly tab is selected
  useEffect(() => {
    if (activeFilters.includes('weekly_feature') && !weeklyChallenges) {
      loadWeeklyChallenges()
    }
  }, [activeFilters, weeklyChallenges])

  const loadWeeklyChallenges = async () => {
    setIsLoadingWeeklyChallenges(true)
    try {
      const response = await fetch('/api/challenges/weekly')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setWeeklyChallenges(data.data)
        console.log('📅 Loaded weekly challenges:', data.data)
      } else {
        console.error('Failed to load weekly challenges:', data.error || 'Unknown error')
        setWeeklyChallenges(null)
      }
    } catch (error) {
      console.error('Error loading weekly challenges:', error)
      setWeeklyChallenges(null)
      toast.error('Failed to load weekly challenges')
    } finally {
      setIsLoadingWeeklyChallenges(false)
    }
  }

  const renderFeedItem = (item: FeedItem, index: number) => {
    if (!item || !item.id || !item.type) {
      console.warn('Invalid feed item:', item)
      return null
    }

    // Base props without motion wrapper since we handle it at parent level
    const baseProps = {
      className: "w-full",
      onDismiss: () => handleDismissItem(item.id)
    }

    switch (item.type) {
      case 'post':
        const postItem = item as PostFeedItem
        // Safety check to ensure post data exists
        if (!postItem.post || !postItem.post.author) {
          console.warn('Invalid post data in feed item:', postItem)
          return null
        }
        
        // Ensure user is not null and has required properties
        if (!user || !user.id) {
          console.warn('User is null or missing id, cannot render post')
          return null
        }
        
        return (
          <FeedPost 
            post={postItem.post} 
            user={user}
            {...baseProps}
          />
        )

      case 'people_suggestion':
        return (
          <PeopleSuggestionCard
            item={item as PeopleSuggestionItem}
            onFollow={handleFollowUser}
            {...baseProps}
          />
        )

      case 'place_recommendation':
        return (
          <PlaceRecommendationCard
            item={item as PlaceRecommendationItem}
            onSave={handleSavePlace}
            {...baseProps}
          />
        )

      case 'weekly_feature':
        // Safety check for weeklyFeature
        if (!weeklyFeature) {
          console.warn('Weekly feature is null, cannot render weekly feature item')
          return null
        }
        
        return (
          <WeeklyFeatureCard
            item={{
              id: weeklyFeature.id || 'weekly-feature',
              type: 'weekly_feature',
              createdAt: weeklyFeature.createdAt || new Date().toISOString(),
              updatedAt: weeklyFeature.updatedAt || new Date().toISOString(),
              priority: 90,
              feature: {
                ...weeklyFeature,
                // Ensure required properties exist with fallbacks
                title: weeklyFeature.title || 'Weekly Feature',
                subtitle: weeklyFeature.subtitle || 'Discover something new this week',
                description: weeklyFeature.description || 'Explore amazing content curated just for you this week.',
                theme: weeklyFeature.theme || 'monday_motivation',
                content: weeklyFeature.content || {
                  type: weeklyFeature.contentType || 'mixed',
                  items: []
                }
              }
            } as WeeklyFeatureItem}
            userLocation={location}
            className="border-0 shadow-none"
          />
        )

      default:
        console.warn('Unknown feed item type:', item.type)
        return null
    }
  }

  // Load weekly feature when weekly tab is selected
  useEffect(() => {
    if (activeFilters.includes('weekly_feature') && !weeklyFeature) {
      loadWeeklyFeature()
    }
  }, [activeFilters, weeklyFeature])

  const loadWeeklyFeature = async () => {
    setIsLoadingWeekly(true)
    try {
      const params = new URLSearchParams()
      
      // Add location if available
      if (location) {
        params.append('lat', location.latitude.toString())
        params.append('lng', location.longitude.toString())
      }
      
      console.log('📅 Loading weekly feature with params:', Object.fromEntries(params))
      
      const response = await fetch(`/api/weekly-features/current?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.data?.feature) {
        setWeeklyFeature(data.data.feature)
        console.log('📅 Loaded weekly feature:', {
          id: data.data.feature.id,
          theme: data.data.theme?.name,
          hasLocation: !!data.data.location,
          contentCounts: data.data.meta?.contentCount,
          isFallback: data.data.meta?.isFallback
        })
      } else {
        console.error('Failed to load weekly feature:', data.error || 'Unknown error')
        setWeeklyFeature(null)
      }
    } catch (error) {
      console.error('Error loading weekly feature:', error)
      setWeeklyFeature(null)
      toast.error('Failed to load weekly feature')
    } finally {
      setIsLoadingWeekly(false)
    }
  }

  // Render weekly challenges page
  const renderWeeklyPage = () => {
    if (isLoadingWeeklyChallenges) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="animate-pulse">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B6B]/20 to-[#4ECDC4]/20 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-64"></div>
                  </div>
                </div>
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (!weeklyChallenges) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#FFE66D]/20 to-[#FF6B6B]/20 rounded-full flex items-center justify-center">
                <Calendar className="w-8 h-8 text-[#FF6B6B]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Weekly Challenges Available</h3>
              <p className="text-gray-600 mb-4">
                We're working on bringing you amazing weekly challenges. Check back soon!
              </p>
              <Button 
                onClick={loadWeeklyChallenges}
                variant="outline"
                className="rounded-full border-[#4ECDC4]/30 hover:border-[#4ECDC4] hover:bg-[#4ECDC4]/10"
              >
                <RefreshCw className="w-4 h-4 mr-2 text-[#4ECDC4]" />
                <span className="text-gray-700">Try Again</span>
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        {/* Weekly Header with Filter Tabs */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#FF6B6B] via-[#4ECDC4] to-[#FFE66D] bg-clip-text text-transparent">
                  Weekly Challenges
                </h1>
                <p className="text-gray-600 text-sm mt-1">Join exciting challenges and vote for next week's adventures</p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={loadWeeklyChallenges}
                disabled={isLoadingWeeklyChallenges}
                className="rounded-full border-[#4ECDC4]/30 hover:border-[#4ECDC4] hover:bg-[#4ECDC4]/10 transition-all duration-300"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingWeeklyChallenges ? 'animate-spin' : ''} text-[#4ECDC4]`} />
                <span className="text-gray-700">{isLoadingWeeklyChallenges ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
            </div>

            {/* Enhanced Content type filters with brand colors - same as main feed */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex items-center gap-2 text-gray-500 text-sm font-medium flex-shrink-0">
                <Filter className="h-4 w-4" />
                <span>Filter:</span>
              </div>
              
              {/* Show All button */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant={activeFilters.length === 0 ? "default" : "outline"}
                  size="sm"
                  onClick={handleShowAll}
                  className={`
                    rounded-full flex-shrink-0 transition-all duration-300 font-medium border-0 min-w-[80px]
                    ${activeFilters.length === 0 
                      ? 'bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white shadow-lg hover:shadow-xl' 
                      : 'bg-white/80 border border-gray-200 hover:border-[#4ECDC4]/50 hover:bg-[#4ECDC4]/5 hover:text-[#4ECDC4] text-gray-600'
                    }
                  `}
                >
                  <TrendingUp className="h-3 w-3 mr-2" />
                  Show All
                  {activeFilters.length === 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-1 text-white/80"
                    >
                      ✨
                    </motion.div>
                  )}
                </Button>
              </motion.div>
              
              {contentTypeFilters.map(filter => {
                const Icon = filter.icon
                const isActive = activeFilters.includes(filter.type)
                
                return (
                  <motion.div
                    key={filter.type}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="group relative"
                  >
                    <Button
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterToggle(filter.type)}
                      className={`
                        rounded-full flex-shrink-0 transition-all duration-300 font-medium border-0 min-w-[90px]
                        ${isActive 
                          ? 'bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white shadow-lg hover:shadow-xl' 
                          : 'bg-white/80 border border-gray-200 hover:border-[#4ECDC4]/50 hover:bg-[#4ECDC4]/5 hover:text-[#4ECDC4] text-gray-600'
                        }
                      `}
                    >
                      <Icon className="h-3 w-3 mr-2" />
                      {filter.label}
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-1 text-white/80"
                        >
                          ✓
                        </motion.div>
                      )}
                    </Button>
                    
                    {/* Enhanced Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-30 shadow-lg">
                      <div className="font-semibold mb-1">{filter.label}</div>
                      <div className="text-gray-300">{filter.description}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </motion.div>
                )
              })}

              {/* Active filter count indicator */}
              {activeFilters.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#FF6B6B]/10 to-[#4ECDC4]/10 border border-[#4ECDC4]/30 rounded-full px-3 py-1 text-sm text-[#4ECDC4] font-medium"
                >
                  <span>{activeFilters.length} filter{activeFilters.length > 1 ? 's' : ''} active</span>
                  <button
                    onClick={handleShowAll}
                    className="text-[#FF6B6B] hover:text-[#FF6B6B]/80 ml-1"
                  >
                    ×
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Weekly Content */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Current Weekly Challenges */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#FF6B6B]" />
                This Week's Challenges
              </h2>
              <div className="grid gap-4">
                {weeklyChallenges.currentChallenges?.map((challenge: any, index: number) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
                  />
                ))}
              </div>
            </div>

            {/* Voting Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">🗳️</span>
                Vote for Next Week
              </h2>
              <p className="text-gray-600 mb-6">Help choose which challenges will be featured next week!</p>
              <div className="grid gap-4">
                {weeklyChallenges.votingOptions?.map((suggestion: any, index: number) => (
                  <ChallengeSuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (error && feedItems.length === 0) {
    return (
      <FeedErrorState 
        message={error}
        onRetry={() => fetchFeedItems(1)}
        className={className}
      />
    )
  }

  // If weekly tab is active, show the weekly page
  if (activeFilters.includes('weekly_feature')) {
    // If weekly_feature is the only active filter, show the weekly challenges page
    if (activeFilters.length === 1 && activeFilters[0] === 'weekly_feature') {
      return renderWeeklyPage()
    }
    // If there are other filters active alongside weekly_feature, show regular feed with those filters
    // This allows users to browse other content types while in the weekly tab
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 ${className}`}>
      {/* Modern Header with brand colors */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#FF6B6B] via-[#4ECDC4] to-[#FFE66D] bg-clip-text text-transparent">
                {activeFilters.includes('weekly_feature') ? 'Weekly Discovery' : 'Discover'}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {activeFilters.includes('weekly_feature') 
                  ? 'Your weekly curated content and community challenges'
                  : 'Your personalized feed of amazing places and stories'
                }
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="rounded-full border-[#4ECDC4]/30 hover:border-[#4ECDC4] hover:bg-[#4ECDC4]/10 transition-all duration-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''} text-[#4ECDC4]`} />
              <span className="text-gray-700">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
          </div>

          {/* Enhanced Content type filters with brand colors */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium flex-shrink-0">
              <Filter className="h-4 w-4" />
              <span>Filter:</span>
            </div>
            
            {/* Show All button */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant={activeFilters.length === 0 ? "default" : "outline"}
                size="sm"
                onClick={handleShowAll}
                className={`
                  rounded-full flex-shrink-0 transition-all duration-300 font-medium border-0 min-w-[80px]
                  ${activeFilters.length === 0 
                    ? 'bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white shadow-lg hover:shadow-xl' 
                    : 'bg-white/80 border border-gray-200 hover:border-[#4ECDC4]/50 hover:bg-[#4ECDC4]/5 hover:text-[#4ECDC4] text-gray-600'
                  }
                `}
              >
                <TrendingUp className="h-3 w-3 mr-2" />
                Show All
                {activeFilters.length === 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-1 text-white/80"
                  >
                    ✨
                  </motion.div>
                )}
              </Button>
            </motion.div>
            
            {contentTypeFilters.map(filter => {
              const Icon = filter.icon
              const isActive = activeFilters.includes(filter.type)
              
              return (
                <motion.div
                  key={filter.type}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative"
                >
                  <Button
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterToggle(filter.type)}
                    className={`
                      rounded-full flex-shrink-0 transition-all duration-300 font-medium border-0 min-w-[90px]
                      ${isActive 
                        ? 'bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white shadow-lg hover:shadow-xl' 
                        : 'bg-white/80 border border-gray-200 hover:border-[#4ECDC4]/50 hover:bg-[#4ECDC4]/5 hover:text-[#4ECDC4] text-gray-600'
                      }
                    `}
                  >
                    <Icon className="h-3 w-3 mr-2" />
                    {filter.label}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-1 text-white/80"
                      >
                        ✓
                      </motion.div>
                    )}
                  </Button>
                  
                  {/* Enhanced Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-30 shadow-lg">
                    <div className="font-semibold mb-1">{filter.label}</div>
                    <div className="text-gray-300">{filter.description}</div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </motion.div>
              )
            })}

            {/* Active filter count indicator */}
            {activeFilters.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="flex items-center gap-2 bg-gradient-to-r from-[#FF6B6B]/10 to-[#4ECDC4]/10 border border-[#4ECDC4]/30 rounded-full px-3 py-1 text-sm text-[#4ECDC4] font-medium"
              >
                <span>{activeFilters.length} filter{activeFilters.length > 1 ? 's' : ''} active</span>
                <button
                  onClick={handleShowAll}
                  className="text-[#FF6B6B] hover:text-[#FF6B6B]/80 ml-1"
                >
                  ×
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Main Feed Content with improved spacing */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Weekly Context Banner - shown when weekly filter is active but other content is displayed */}
        {activeFilters.includes('weekly_feature') && activeFilters.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-r from-[#FFE66D]/10 to-[#FF6B6B]/10 border border-[#FFE66D]/30 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-[#FFE66D] to-[#FF6B6B] rounded-full">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Weekly Mode Active</h3>
                  <p className="text-sm text-gray-600">You're browsing weekly content. Want to see this week's challenges?</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveFilters(['weekly_feature'])}
                className="rounded-full border-[#FFE66D]/50 hover:border-[#FFE66D] hover:bg-[#FFE66D]/10 text-[#FF6B6B] hover:text-[#FF6B6B]/80"
              >
                View Challenges
              </Button>
            </div>
          </motion.div>
        )}

        {isLoading && feedItems.length === 0 ? (
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
        ) : feedItems.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#FF6B6B]/10 to-[#4ECDC4]/10 rounded-full flex items-center justify-center">
              <TrendingUp className="w-10 h-10 text-[#FF6B6B]" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No content yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              We're working on getting your personalized feed ready. Check back soon for amazing content!
            </p>
            <Button 
              onClick={handleRefresh}
              className="bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white rounded-full px-6 py-2 hover:shadow-lg transition-all duration-300"
            >
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {feedItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ 
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: "easeOut"
                  }}
                  className="relative"
                >
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden">
                    {renderFeedItem(item, index)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Enhanced Load more section */}
            {hasMore && feedItems.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center pt-8 pb-4"
              >
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="rounded-full px-8 py-3 border-[#4ECDC4]/30 hover:border-[#4ECDC4] hover:bg-[#4ECDC4]/10 transition-all duration-300 font-medium"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#4ECDC4] border-t-transparent rounded-full animate-spin mr-2" />
                      <span className="text-gray-700">Loading more content...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-700">Load More</span>
                      <motion.div
                        className="ml-2"
                        animate={{ y: [0, -2, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        ✨
                      </motion.div>
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* End of feed message */}
            {!hasMore && feedItems.length > 5 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#FFE66D]/20 to-[#FF6B6B]/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🎉</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">You're all caught up!</h3>
                  <p className="text-gray-600">You've seen all the latest content</p>
                  <Button 
                    variant="outline"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="rounded-full border-[#4ECDC4]/30 hover:border-[#4ECDC4] hover:bg-[#4ECDC4]/10 mt-4"
                  >
                    <span className="text-gray-700">Back to top</span>
                    <span className="ml-2">↑</span>
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 