"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  ChevronRight, 
  X, 
  Clock, 
  Star, 
  Users,
  Sparkles,
  Heart,
  Share2,
  MapPin,
  Navigation,
  Bookmark,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Camera,
  Award,
  AlertCircle,
  RefreshCw,
  Target,
  Trophy,
  TrendingUp,
  Eye,
  Check,
  Wifi,
  WifiOff
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import type { WeeklyFeatureItem } from '@/types/feed'
import { WEEKLY_THEMES } from '@/types/feed'
import { getImageUrl } from '@/lib/image-utils'
import { getWeeklyFeedSync } from '@/lib/weekly-feed-sync'

interface WeeklyFeatureCardProps {
  item: WeeklyFeatureItem
  onDismiss?: () => void
  userLocation?: { latitude: number; longitude: number }
  className?: string
}

export default function WeeklyFeatureCard({
  item,
  onDismiss,
  userLocation,
  className = ""
}: WeeklyFeatureCardProps) {
  // Early validation to prevent undefined errors
  if (!item || !item.feature) {
    console.warn('Invalid weekly feature item:', item)
    return (
      <Card className={`overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl ${className}`}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Weekly Feature Unavailable</h3>
          <p className="text-gray-600">Unable to load this week's featured content.</p>
        </CardContent>
      </Card>
    )
  }

  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedContent, setSelectedContent] = useState<'locations' | 'posts' | 'challenges'>('locations')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [weeklyInsights, setWeeklyInsights] = useState<any>(null)
  const [isSynced, setIsSynced] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('')
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')

  // Initialize weekly feed sync
  useEffect(() => {
    const weeklySync = getWeeklyFeedSync()
    
    // Subscribe to feature updates
    const unsubscribeFeature = weeklySync.subscribe('feature_updated', (data) => {
      console.log('WeeklyFeatureCard: Received feature update from another tab')
      setLastUpdateTime(new Date().toLocaleTimeString())
      setIsSynced(true)
      
      // Update insights if available
      if (data.insights) {
        setWeeklyInsights(data.insights)
      }
      
      // Show toast notification
      toast.success('Weekly content updated!', {
        description: 'New content is available from another tab',
        duration: 3000
      })
    })

    // Subscribe to insights updates
    const unsubscribeInsights = weeklySync.subscribe('insights_updated', (data) => {
      console.log('WeeklyFeatureCard: Received insights update from another tab')
      setWeeklyInsights(data)
      setLastUpdateTime(new Date().toLocaleTimeString())
    })

    // Subscribe to content refresh requests
    const unsubscribeRefresh = weeklySync.subscribe('content_refresh', () => {
      console.log('WeeklyFeatureCard: Received refresh request from another tab')
      handleRefresh()
    })

    // Subscribe to user interactions
    const unsubscribeInteraction = weeklySync.subscribe('user_interaction', (data) => {
      console.log('WeeklyFeatureCard: Received user interaction from another tab:', data)
      // Handle cross-tab interactions (e.g., likes, shares, etc.)
      if (data.type === 'content_viewed') {
        // Update view counts or other metrics
      }
    })

    // Set sync status
    setSyncStatus('connected')
    setIsSynced(true)

    // Cleanup subscriptions
    return () => {
      unsubscribeFeature()
      unsubscribeInsights()
      unsubscribeRefresh()
      unsubscribeInteraction()
    }
  }, [])

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Broadcast dismissal to other tabs
    const weeklySync = getWeeklyFeedSync()
    weeklySync.broadcastInteraction('card_dismissed', {
      featureId: item.feature.id,
      timestamp: new Date().toISOString()
    })
    
    onDismiss?.()
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.feature.title || 'Weekly Feature',
          text: item.feature.description || 'Check out this week\'s feature',
          url: window.location.href
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Link copied to clipboard!')
      }

      // Broadcast share interaction to other tabs
      const weeklySync = getWeeklyFeedSync()
      weeklySync.broadcastInteraction('content_shared', {
        featureId: item.feature.id,
        method: typeof navigator.share === 'function' ? 'native' : 'clipboard',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error sharing:', error)
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Failed to share')
      }
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Request refresh from other tabs
      const weeklySync = getWeeklyFeedSync()
      weeklySync.requestContentRefresh()
      
      // Trigger a page refresh or refetch data
      window.location.reload()
    } catch (error) {
      console.error('Error refreshing:', error)
      toast.error('Failed to refresh content')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Load real weekly insights data with cross-tab sync
  useEffect(() => {
    const loadWeeklyInsights = async () => {
      try {
        const response = await fetch('/api/weekly-features/insights')
        if (response.ok) {
          const data = await response.json()
          setWeeklyInsights(data.data)
          
          // Broadcast insights update to other tabs
          const weeklySync = getWeeklyFeedSync()
          weeklySync.updateInsights(data.data)
        }
      } catch (error) {
        console.error('Error loading weekly insights:', error)
      }
    }

    loadWeeklyInsights()
  }, [])

  // Get theme configuration with fallback
  const themeConfig = WEEKLY_THEMES.find(theme => theme.id === item.feature.theme) || WEEKLY_THEMES[1]
  
  const getCurrentWeekText = () => {
    try {
      const now = new Date()
      const weekNumber = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)
      return `Week ${weekNumber}, ${now.getFullYear()}`
    } catch (error) {
      console.error('Error calculating week text:', error)
      return 'This Week'
    }
  }

  const getLocationBasedGreeting = () => {
    if (!userLocation) return "Discover amazing places this week"
    
    try {
      const hour = new Date().getHours()
      let timeGreeting = ''
      
      if (hour < 12) timeGreeting = 'Good morning'
      else if (hour < 17) timeGreeting = 'Good afternoon'
      else timeGreeting = 'Good evening'
      
      return `${timeGreeting}! Here's what's trending near you`
    } catch (error) {
      console.error('Error getting greeting:', error)
      return "Discover amazing places near you"
    }
  }

  // Get real content from the feature with better error handling
  const getRealContent = () => {
    try {
      const content = item.feature.content || {}
      return {
        locations: Array.isArray((content as any).locations) ? (content as any).locations : [],
        posts: Array.isArray((content as any).posts) ? (content as any).posts : [],
        challenges: Array.isArray((content as any).challenges) ? (content as any).challenges : []
      }
    } catch (error) {
      console.error('Error getting real content:', error)
      return {
        locations: [],
        posts: [],
        challenges: []
      }
    }
  }

  const realContent = getRealContent()

  // Handle location visit with real navigation and cross-tab sync
  const handleLocationVisit = (location: any) => {
    // Broadcast location visit to other tabs
    const weeklySync = getWeeklyFeedSync()
    weeklySync.broadcastInteraction('location_visited', {
      locationId: location.id,
      locationName: location.name,
      timestamp: new Date().toISOString()
    })

    if (location.coordinates) {
      // Open in maps app
      const url = `https://maps.google.com/maps?q=${location.coordinates.latitude},${location.coordinates.longitude}`
      window.open(url, '_blank')
    } else if (location.id) {
      // Navigate to location page using slug if available, otherwise use ID
      const locationUrl = location.slug 
        ? `/locations/${location.slug}` 
        : `/locations/${location.id}`
      window.open(locationUrl, '_blank')
    } else {
      // Fallback to Google Maps search
      const url = `https://maps.google.com/maps?q=${encodeURIComponent(location.name)}`
      window.open(url, '_blank')
    }
  }

  // Handle post view with cross-tab sync
  const handlePostView = (post: any) => {
    // Broadcast post view to other tabs
    const weeklySync = getWeeklyFeedSync()
    weeklySync.broadcastInteraction('post_viewed', {
      postId: post.id,
      postTitle: post.title,
      timestamp: new Date().toISOString()
    })

    if (post.id) {
      window.open(`/post/${post.id}`, '_blank')
    } else {
      toast.info('Post details coming soon!')
    }
  }

  // Handle challenge join with cross-tab sync
  const handleChallengeJoin = async (challenge: any) => {
    // Broadcast challenge join to other tabs
    const weeklySync = getWeeklyFeedSync()
    weeklySync.broadcastInteraction('challenge_joined', {
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      timestamp: new Date().toISOString()
    })

    // Check if this is a generated weekly challenge (not a real challenge from the database)
    if (challenge.id && challenge.id.startsWith('challenge-') && challenge.theme) {
      // This is a generated weekly challenge, show coming soon message
      toast.info('Challenge system coming soon! Stay tuned for real challenges.')
      return
    }

    // Only try to join real challenges that have proper API endpoints
    if (!challenge.id || typeof challenge.id !== 'string' || challenge.id.length < 10) {
      toast.info('This challenge is not yet available. Check back soon!')
      return
    }

    try {
      // Use the correct API endpoint format that expects challengeId in request body
      const response = await fetch('/api/challenges/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: challenge.id })
      })
      
      if (response.status === 404) {
        toast.info('Challenge system coming soon! Stay tuned for real challenges.')
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || 'Successfully joined challenge!')
        // Refresh the challenge data
        handleRefresh()
      } else {
        const error = await response.json()
        toast.error(error.error || error.message || 'Failed to join challenge')
      }
    } catch (error) {
      console.error('Error joining challenge:', error)
      toast.info('Challenge system coming soon! Stay tuned for real challenges.')
    }
  }

  const renderLocationContent = () => (
    <div className="space-y-4">
      {realContent.locations.length > 0 ? (
        realContent.locations.map((location: any, index: number) => {
          // Validate location data
          if (!location || !location.id || !location.name) {
            console.warn('Invalid location data:', location)
            return null
          }

          return (
            <motion.div
              key={location.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-[#4ECDC4]/20 to-[#FF6B6B]/20 rounded-xl flex items-center justify-center">
                <MapPin className="w-8 h-8 text-[#4ECDC4]" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900 group-hover:text-[#FF6B6B] transition-colors truncate">
                    {location.name}
                  </h4>
                  {location.category && (
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {location.category}
                    </Badge>
                  )}
                  {location.isOpen !== undefined && (
                    <Badge className={`text-xs flex-shrink-0 ${location.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {location.isOpen ? 'Open' : 'Closed'}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                  {location.description || 'Discover this amazing place'}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {location.distance && (
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {location.distance} miles away
                    </span>
                  )}
                  {location.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {location.rating.toFixed(1)}
                    </span>
                  )}
                  {location.priceRange && (
                    <span className="flex items-center gap-1">
                      <span className="text-green-600 font-medium">
                        {location.priceRange === 'budget' ? '$' : 
                         location.priceRange === 'moderate' ? '$$' : 
                         location.priceRange === 'expensive' ? '$$$' : 
                         location.priceRange === 'luxury' ? '$$$$' : location.priceRange}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleLocationVisit(location)}
                className="rounded-full border-[#4ECDC4]/30 hover:border-[#4ECDC4] hover:bg-[#4ECDC4]/10 text-[#4ECDC4] flex-shrink-0"
              >
                <Navigation className="w-4 h-4 mr-1" />
                Visit
              </Button>
            </motion.div>
          )
        }).filter(Boolean)
      ) : (
        <div className="text-center py-8 text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No nearby locations found</p>
          <p className="text-sm">Try expanding your search radius</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="mt-3"
          >
            {isRefreshing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      )}
    </div>
  )

  const renderPostContent = () => (
    <div className="space-y-4">
      {realContent.posts.length > 0 ? (
        realContent.posts.map((post: any, index: number) => {
          // Validate post data
          if (!post || !post.id) {
            console.warn('Invalid post data:', post)
            return null
          }

          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
            >
              <Avatar className="w-12 h-12">
                <AvatarImage src={post.author?.avatar} alt={post.author?.name} />
                <AvatarFallback className="bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] text-white">
                  {post.author?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 group-hover:text-[#FF6B6B] transition-colors line-clamp-1">
                  {post.title || 'Untitled Post'}
                </h4>
                <p className="text-sm text-gray-600 mb-1">
                  by {post.author?.name || 'Anonymous'}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {post.likes || 0} likes
                  </span>
                  {post.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {post.location}
                    </span>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePostView(post)}
                className="rounded-full border-[#FF6B6B]/30 hover:border-[#FF6B6B] hover:bg-[#FF6B6B]/10 text-[#FF6B6B] flex-shrink-0"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                View
              </Button>
            </motion.div>
          )
        }).filter(Boolean)
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Camera className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No recent posts found</p>
          <p className="text-sm">Check back later for new content</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="mt-3"
          >
            {isRefreshing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      )}
    </div>
  )

  const renderChallengeContent = () => (
    <div className="space-y-4">
      {realContent.challenges.length > 0 ? (
        realContent.challenges.map((challenge: any, index: number) => {
          // Validate challenge data
          if (!challenge || !challenge.id || !challenge.title) {
            console.warn('Invalid challenge data:', challenge)
            return null
          }

          const isExpired = challenge.expiresAt && new Date(challenge.expiresAt) < new Date()
          const isJoined = challenge.isJoined || false

          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 bg-gradient-to-r from-[#FFE66D]/10 to-[#FF6B6B]/10 rounded-xl border border-[#FFE66D]/30 hover:border-[#FF6B6B]/30 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#FFE66D] to-[#FF6B6B] rounded-full flex items-center justify-center">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-[#FF6B6B] transition-colors">
                      {challenge.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {challenge.difficulty || 'Easy'}
                      </Badge>
                      {isExpired && (
                        <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-300">
                          Expired
                        </Badge>
                      )}
                      {isJoined && (
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                          Joined
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div className="font-semibold text-[#FF6B6B] flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    {challenge.reward || 'Points'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {challenge.participants || 0} joined
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                {challenge.description || 'Join this exciting challenge!'}
              </p>
              
              {challenge.expiresAt && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                  <Clock className="w-3 h-3" />
                  <span>
                    {isExpired ? 'Expired' : `Expires ${new Date(challenge.expiresAt).toLocaleDateString()}`}
                  </span>
                </div>
              )}
              
              <Button
                size="sm"
                onClick={() => handleChallengeJoin(challenge)}
                disabled={isExpired || isJoined || (challenge.id && challenge.id.startsWith('challenge-') && challenge.theme)}
                className={`w-full transition-all ${
                  isExpired 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : isJoined
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : (challenge.id && challenge.id.startsWith('challenge-') && challenge.theme)
                    ? 'bg-blue-100 text-blue-600 cursor-not-allowed border border-blue-200'
                    : 'bg-gradient-to-r from-[#FFE66D] to-[#FF6B6B] text-white hover:shadow-lg'
                }`}
              >
                {isExpired ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Challenge Ended
                  </>
                ) : isJoined ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Already Joined
                  </>
                ) : (challenge.id && challenge.id.startsWith('challenge-') && challenge.theme) ? (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Coming Soon
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Join Challenge
                  </>
                )}
              </Button>
            </motion.div>
          )
        }).filter(Boolean)
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No active challenges</p>
          <p className="text-sm">New challenges coming soon!</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="mt-3"
          >
            {isRefreshing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <Card className={`overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl ${className}`}>
      {/* Header with theme gradient using brand colors */}
      <div className="relative p-6 text-white bg-gradient-to-br from-[#FF6B6B] via-[#4ECDC4] to-[#FFE66D]">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-radial from-white/10 to-transparent" />
        </div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{themeConfig.emoji}</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium opacity-90">{getCurrentWeekText()}</span>
                {/* Sync status indicator */}
                <div className="flex items-center gap-1 ml-2">
                  {syncStatus === 'connected' ? (
                    <Wifi className="h-3 w-3 text-green-300" />
                  ) : syncStatus === 'connecting' ? (
                    <div className="h-3 w-3 border border-white/50 border-t-transparent rounded-full animate-spin" title="Connecting..." />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-300" />
                  )}
                  {isSynced && lastUpdateTime && (
                    <span className="text-xs opacity-75" title={`Last updated: ${lastUpdateTime}`}>
                      Live
                    </span>
                  )}
                </div>
              </div>
              <h3 className="font-bold text-xl">{themeConfig.name}</h3>
              <p className="text-white/90 text-sm">{getLocationBasedGreeting()}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleShare}
              className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300"
            >
              <Share2 className="h-4 w-4" />
            </motion.button>
            
            {onDismiss && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDismiss}
                className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300"
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-6 bg-white">
        {/* Content type selector */}
        <div className="flex gap-2 mb-6 bg-gray-100 rounded-xl p-1">
          {[
            { key: 'locations', label: 'Places', icon: MapPin, count: realContent.locations.length },
            { key: 'posts', label: 'Posts', icon: Camera, count: realContent.posts.length },
            { key: 'challenges', label: 'Challenges', icon: Award, count: realContent.challenges.length }
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = selectedContent === tab.key
            
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedContent(tab.key as any)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300
                  ${isActive 
                    ? 'bg-white text-[#FF6B6B] shadow-sm' 
                    : 'text-gray-600 hover:text-[#FF6B6B] hover:bg-white/50'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600">
                  {tab.count}
                </Badge>
              </button>
            )
          })}
        </div>

        {/* Content based on selection */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedContent}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {selectedContent === 'locations' && renderLocationContent()}
            {selectedContent === 'posts' && renderPostContent()}
            {selectedContent === 'challenges' && renderChallengeContent()}
          </motion.div>
        </AnimatePresence>

        {/* Location-based stats */}
        {userLocation && (
          <div className="mt-6 p-4 bg-gradient-to-r from-[#4ECDC4]/10 to-[#FFE66D]/10 rounded-xl border border-[#4ECDC4]/20">
            <div className="flex items-center gap-2 text-[#4ECDC4] mb-2">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium">
                Based on your location
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Showing content within 25 miles of your area. Want to explore further?
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-[#4ECDC4] hover:bg-[#4ECDC4]/10 h-8 px-3 text-xs"
            >
              Expand search radius
            </Button>
          </div>
        )}

        {/* Expand/Collapse toggle */}
        <div className="mt-6 flex justify-center">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Explore More
              </>
            )}
          </Button>
        </div>

        {/* Expanded content with real weekly insights */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="pt-6 border-t border-gray-100 mt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Weekly Insights</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-gray-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-[#FF6B6B] flex items-center justify-center gap-2">
                      <Users className="w-5 h-5" />
                      {weeklyInsights?.activeExplorers || ((item.feature.content as any)?.insights?.activeExplorers) || 0}
                    </div>
                    <div className="text-xs text-gray-600">Active explorers</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-[#4ECDC4] flex items-center justify-center gap-2">
                      <Eye className="w-5 h-5" />
                      {weeklyInsights?.newDiscoveries || ((item.feature.content as any)?.insights?.newDiscoveries) || 0}
                    </div>
                    <div className="text-xs text-gray-600">New discoveries</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-medium text-gray-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#FF6B6B]" />
                    Trending This Week
                  </h5>
                  {(
                    (weeklyInsights?.trending || ((item.feature.content as any)?.insights?.trending) || []) as any[]
                  ).length > 0 ? (
                    ((weeklyInsights?.trending || ((item.feature.content as any)?.insights?.trending) || []) as any[]).map((trend: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 bg-[#FF6B6B] rounded-full" />
                        <span>{trend}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      No trending data available this week
                    </div>
                  )}
                </div>

                {/* Additional real insights */}
                {weeklyInsights && Array.isArray(weeklyInsights.goals) && weeklyInsights.goals.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h5 className="font-medium text-gray-800 flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#4ECDC4]" />
                      Community Goals
                    </h5>
                    <div className="grid grid-cols-1 gap-2">
                      {weeklyInsights.goals.map((goal: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gradient-to-r from-[#4ECDC4]/5 to-[#FFE66D]/5 rounded-lg">
                          <span className="text-sm text-gray-700">{goal.title}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-[#4ECDC4] to-[#FFE66D] h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(goal.progress || 0, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{goal.progress || 0}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show message when no insights are available */}
                {!weeklyInsights && !(item.feature.content as any)?.insights && (
                  <div className="mt-6 text-center py-8 text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Weekly insights coming soon!</p>
                    <p className="text-xs text-gray-400 mt-1">Check back for community trends and goals</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
} 