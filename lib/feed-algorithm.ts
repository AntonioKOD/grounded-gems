import { getPayload } from 'payload'
import config from '@/payload.config'
import type { 
  FeedItem, 
  FeedMixConfig, 
  FeedAlgorithmParams as OriginalFeedAlgorithmParams,
  PostFeedItem,
  PeopleSuggestionItem,
  NoPeopleSuggestionsItem,
  PlaceRecommendationItem,
  GuideSpotlightItem,
  WeeklyFeatureItem,
  ChallengeCardItem,
  MiniBlogCardItem
} from '@/types/feed'
import { WEEKLY_THEMES } from '@/types/feed'

type FeedAlgorithmParams = OriginalFeedAlgorithmParams & {
  page?: number
  limit?: number
  feedType?: string
  sortBy?: string
  filters?: any
}

// Default feed mix configuration
const DEFAULT_FEED_MIX: FeedMixConfig = {
  posts: 75,
  peopleSuggestions: 5,
  placeRecommendations: 10,
  guideSpotlights: 5,
  weeklyFeatures: 3,
  challenges: 2
}

// Time-based feed adjustments
const TIME_BASED_ADJUSTMENTS = {
  morning: {
    placeRecommendations: +5, // More breakfast/coffee spots
    posts: -5
  },
  afternoon: {
    posts: +3,
    peopleSuggestions: +1,
    placeRecommendations: -5
  },
  evening: {
    guideSpotlights: +3, // More time to read
    weeklyFeatures: +2,
    posts: -5
  },
  night: {
    weeklyFeatures: +5, // Planning for tomorrow
    challenges: +3,
    posts: -8
  }
}

// Cache for user data to prevent redundant queries
const userDataCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

export class FeedAlgorithm {
  private payload: any

  constructor() {
    this.initializePayload()
  }

  private async initializePayload() {
    this.payload = await getPayload({ config })
  }

  /**
   * Get user data with caching to prevent redundant queries
   */
  private async getUserData(userId?: string) {
    if (!userId) return null
    
    const now = Date.now()
    const cached = userDataCache.get(userId)
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('📦 Using cached user data for:', userId)
      return cached.data
    }
    
    try {
      console.log('🔍 Fetching fresh user data for:', userId)
      const user = await this.payload.findByID({
        collection: 'users',
        id: userId,
        depth: 1 // Increased depth to get more data in one query
      })
      
      const userData = {
        likedPosts: Array.isArray(user.likedPosts) ? user.likedPosts : [],
        savedPosts: Array.isArray(user.savedPosts) ? user.savedPosts : [],
        interests: user.interests || [],
        location: user.location,
        followers: user.followers || [],
        following: user.following || []
      }
      
      userDataCache.set(userId, { data: userData, timestamp: now })
      return userData
    } catch (error) {
      console.log('Could not fetch user data:', error)
      return null
    }
  }

  /**
   * Helper function to process media URLs consistently across all fetch methods
   */
  private processMediaUrl(mediaItem: any): string | null {
    if (!mediaItem) return null
    
    let url: string | null = null
    
    if (typeof mediaItem === 'string') {
      // If it's a string, check if it's already a URL or just an ID
      if (mediaItem.startsWith('http') || mediaItem.startsWith('/api/media/')) {
        url = mediaItem
      } else {
        // It's likely a media ID, construct the URL
        url = `/api/media/file/${mediaItem}`
      }
    } else if (typeof mediaItem === 'object') {
      // Try different URL sources in order of preference
      url = mediaItem.url || 
            mediaItem.sizes?.card?.url || 
            mediaItem.sizes?.thumbnail?.url || 
            mediaItem.thumbnailURL ||
            (mediaItem.filename ? `/api/media/file/${mediaItem.filename}` : null)
    }
    
    if (!url) return null
    
    // Fix CORS issues by ensuring URLs use the same domain as the current site
    if (url.startsWith('/') && !url.startsWith('http')) {
      // For relative URLs, ensure they're properly formatted
      if (!url.startsWith('/api/media/')) {
        url = `/api/media/file/${url.replace(/^\/+/, '')}`
      }
    } else if (url.startsWith('http')) {
      // Fix cross-origin issues by replacing www.sacavia.com with sacavia.com
      // or vice versa to match the current domain
      try {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'sacavia.com'
        const urlObj = new URL(url)
        
        if (urlObj.hostname === 'www.sacavia.com' && currentDomain === 'sacavia.com') {
          urlObj.hostname = 'sacavia.com'
          url = urlObj.toString()
        } else if (urlObj.hostname === 'sacavia.com' && currentDomain === 'www.sacavia.com') {
          urlObj.hostname = 'www.sacavia.com'
          url = urlObj.toString()
        }
      } catch (error) {
        console.warn('Error processing media URL:', error)
      }
    }
    
    return url
  }

  /**
   * Generate the main feed
   */
  async generateFeed(params: FeedAlgorithmParams): Promise<FeedItem[]> {
    try {
      await this.initializePayload()
      
      const {
        userId,
        page = 1,
        limit = 20,
        feedType = 'all',
        sortBy = 'recommended',
        location,
        weather,
        timeOfDay,
        interests = [],
        socialCircle = [],
        filters = {}
      } = params

      console.log('🎯 Generating feed with params:', {
        userId,
        page,
        limit,
        feedType,
        sortBy,
        hasLocation: !!location,
        hasWeather: !!weather,
        hasTimeOfDay: !!timeOfDay,
        interestsCount: interests.length,
        socialCircleCount: socialCircle.length,
        filters
      })

      // Get user data once and reuse it across all methods
      const userData = await this.getUserData(userId)
      const userInterests = userData?.interests || interests

      // Determine which content types to fetch based on filters
      const includeTypes = filters?.includeTypes || []
      const excludeTypes = filters?.excludeTypes || []
      
      console.log('🎯 Content type filters:', { includeTypes, excludeTypes })

      // Fetch content based on filters
      let allItems: FeedItem[] = []
      
      // If specific types are requested, only fetch those
      if (includeTypes.length > 0) {
        const fetchPromises: Promise<FeedItem[]>[] = []
        
        if (includeTypes.includes('post')) {
          fetchPromises.push(this.fetchPosts(userData, Math.ceil(limit * 0.8), page, location, userInterests))
        }
        
        if (includeTypes.includes('people_suggestion')) {
          fetchPromises.push(this.fetchPeopleSuggestions(userData, Math.ceil(limit * 0.6), socialCircle))
        }
        
        if (includeTypes.includes('place_recommendation')) {
          fetchPromises.push(this.fetchPlaceRecommendations(userData, Math.ceil(limit * 0.8), location, weather, timeOfDay))
        }
        
        if (includeTypes.includes('weekly_feature')) {
          fetchPromises.push(this.fetchWeeklyFeatures(Math.ceil(limit * 0.2)))
        }
        
        if (includeTypes.includes('guide_spotlight')) {
          fetchPromises.push(this.fetchGuideSpotlights(userData, Math.ceil(limit * 0.2), userInterests))
        }
        
        if (includeTypes.includes('mini_blog_card')) {
          fetchPromises.push(this.fetchMiniBlogCards(userData, Math.ceil(limit * 0.2), userInterests))
        }
        
        const results = await Promise.all(fetchPromises)
        allItems = results.flat()
      } else {
        // Fetch all content types in parallel with optimized queries
        const [
          posts,
          weeklyFeatures,
          peopleSuggestions,
          placeRecommendations,
          miniBlogCards
        ] = await Promise.all([
          this.fetchPosts(userData, Math.ceil(limit * 0.6), page, location, userInterests),
          this.fetchWeeklyFeatures(1),
          this.fetchPeopleSuggestions(userData, Math.ceil(limit * 0.3), socialCircle),
          this.fetchPlaceRecommendations(userData, 2, location, weather, timeOfDay),
          this.fetchMiniBlogCards(userData, 2, userInterests)
        ])

        // Combine all content
        allItems = [
          ...posts,
          ...weeklyFeatures,
          ...peopleSuggestions,
          ...placeRecommendations,
          ...miniBlogCards
        ]
      }

      console.log('📊 Fetched content counts:', {
        posts: allItems.filter(item => item.type === 'post').length,
        weeklyFeatures: allItems.filter(item => item.type === 'weekly_feature').length,
        peopleSuggestions: allItems.filter(item => item.type === 'people_suggestion').length,
        placeRecommendations: allItems.filter(item => item.type === 'place_recommendation').length,
        miniBlogCards: allItems.filter(item => item.type === 'mini_blog_card').length,
        total: allItems.length
      })

      // Apply exclude filters
      if (excludeTypes.length > 0) {
        allItems = allItems.filter(item => !excludeTypes.includes(item.type))
        console.log('🚫 Excluded content types:', excludeTypes)
      }

      // Sort items based on algorithm
      allItems = this.sortFeedItems(allItems, sortBy, userId, userInterests, location)

      // Apply intelligent shuffling for better variety (only if not filtering by specific types)
      if (includeTypes.length === 0) {
        allItems = this.intelligentShuffle(allItems)
      }

      // Apply pagination
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedItems = allItems.slice(startIndex, endIndex)

      console.log('✅ Feed generation complete:', {
        totalItems: allItems.length,
        paginatedItems: paginatedItems.length,
        page,
        limit,
        hasMore: endIndex < allItems.length
      })

      return paginatedItems
    } catch (error) {
      console.error('Error generating feed:', error)
      return []
    }
  }

  /**
   * Calculate personalized feed mix based on context
   */
  private calculateFeedMix(
    timeOfDay: string,
    interests: string[],
    recentActivity: string[]
  ): FeedMixConfig {
    let mix = { ...DEFAULT_FEED_MIX }

    // Apply time-based adjustments
    const timeAdjustments = TIME_BASED_ADJUSTMENTS[timeOfDay as keyof typeof TIME_BASED_ADJUSTMENTS]
    if (timeAdjustments) {
      Object.keys(timeAdjustments).forEach(key => {
        const adjustment = timeAdjustments[key as keyof typeof timeAdjustments]
        if (key in mix) {
          mix[key as keyof FeedMixConfig] = Math.max(0, mix[key as keyof FeedMixConfig] + adjustment)
        }
      })
    }

    // Adjust based on user interests
    if (interests.includes('food')) {
      mix.placeRecommendations += 5
      mix.posts -= 5
    }
    if (interests.includes('travel')) {
      mix.guideSpotlights += 3
      mix.weeklyFeatures += 2
      mix.posts -= 5
    }
    if (interests.includes('social')) {
      mix.peopleSuggestions += 2
      mix.challenges += 3
      mix.posts -= 5
    }

    // Normalize to ensure total is 100%
    const total = Object.values(mix).reduce((sum, val) => sum + val, 0)
    Object.keys(mix).forEach(key => {
      mix[key as keyof FeedMixConfig] = Math.round((mix[key as keyof FeedMixConfig] / total) * 100)
    })

    return mix
  }

  /**
   * Calculate actual item counts based on percentages
   */
  private calculateItemCounts(mix: FeedMixConfig, totalItems: number): Record<string, number> {
    return {
      posts: Math.ceil((mix.posts / 100) * totalItems),
      peopleSuggestions: Math.ceil((mix.peopleSuggestions / 100) * totalItems),
      placeRecommendations: Math.ceil((mix.placeRecommendations / 100) * totalItems),
      guideSpotlights: Math.ceil((mix.guideSpotlights / 100) * totalItems),
      weeklyFeatures: Math.ceil((mix.weeklyFeatures / 100) * totalItems),
      challenges: Math.ceil((mix.challenges / 100) * totalItems)
    }
  }

  /**
   * Fetch regular posts
   */
  private async fetchPosts(
    userData: any,
    limit: number = 10,
    page: number = 1,
    location?: { latitude: number; longitude: number },
    interests: string[] = []
  ): Promise<PostFeedItem[]> {
    if (!this.payload) await this.initializePayload()

    try {
      // Get user's liked and saved posts if userId is provided
      const userLikedPosts = userData?.likedPosts || []
      const userSavedPosts = userData?.savedPosts || []
      
      const posts = await this.payload.find({
        collection: 'posts',
        limit,
        depth: 2,
        where: {
          status: { equals: 'published' }
        },
        sort: '-createdAt'
      })

      if (!posts.docs || posts.docs.length === 0) {
        console.log('No posts found in database')
        return []
      }

      // Filter out posts with private locations
      const filteredPosts = posts.docs.filter((post: any) => {
        if (post.location && post.location.privacy && post.location.privacy.toLowerCase() === 'private') {
          return false
        }
        return true
      })

      return filteredPosts.map((post: any) => {
        // Check if user has liked or saved this post
        const isLiked = userLikedPosts.includes(post.id)
        const isSaved = userSavedPosts.includes(post.id)
        
        // Enhanced media handling with better URL processing and deduplication
        let media: any[] = []
        const processedUrls = new Set<string>()
        
        // Add main image
        if (post.image) {
          const imageUrl = this.processMediaUrl(post.image)
          if (imageUrl && !processedUrls.has(imageUrl)) {
            media.push({
              type: 'image',
              url: imageUrl,
              alt: typeof post.image === 'object' ? post.image.alt : undefined
            })
            processedUrls.add(imageUrl)
          }
        }

        // Add video if exists - reels-style (no thumbnail)
        if (post.video) {
          const videoUrl = this.processMediaUrl(post.video)
          if (videoUrl && !processedUrls.has(videoUrl)) {
            const videoItem = {
              type: 'video',
              url: videoUrl,
              // No thumbnail for reels-style autoplay
              duration: typeof post.video === 'object' ? post.video.duration : undefined,
              alt: 'Post video'
            }
            media.push(videoItem)
            processedUrls.add(videoUrl)
          }
        }

        // Add photos array if exists, avoiding duplicates
        if (post.photos && Array.isArray(post.photos)) {
          const validPhotos = post.photos
            .map((photo: any): { type: string; url: string; alt?: string } | null => {
              const photoUrl = this.processMediaUrl(photo)
              return photoUrl && !processedUrls.has(photoUrl) ? {
                type: 'image',
                url: photoUrl,
                alt: typeof photo === 'object' ? photo.alt : undefined
              } : null
            })
            .filter((photo: { type: string; url: string; alt?: string } | null): photo is { type: string; url: string; alt?: string } => photo !== null) // Only include photos with valid URLs

          // Add unique photos and track their URLs
          validPhotos.forEach((photo: { url: string }) => {
            if (photo && !processedUrls.has(photo.url)) {
              media.push(photo)
              processedUrls.add(photo.url)
            }
          })
        }
        
        return {
          id: `post_${post.id}`,
          type: 'post',
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          priority: this.calculatePostPriority(post, userData?.id, interests),
          post: {
            id: post.id,
            content: post.content || '',
            title: post.title,
            author: {
              id: post.author?.id || '',
              name: post.author?.name || 'Anonymous',
              avatar: this.processMediaUrl(post.author?.avatar || post.author?.profileImage),
              profileImage: post.author?.profileImage ? {
                url: this.processMediaUrl(post.author.profileImage)
              } : null
            },
            // Enhanced media array for modern feed display
            media,
            // Legacy fields for backward compatibility
            image: this.processMediaUrl(post.featuredImage || post.image),
            video: this.processMediaUrl(post.video),
            photos: post.photos?.map((photo: any) => this.processMediaUrl(photo)).filter(Boolean) || [],
            location: post.location,
            type: post.type || 'post',
            rating: post.rating,
            tags: post.tags?.map((tag: any) => typeof tag === 'string' ? tag : tag.tag) || [],
            likeCount: post.likeCount || (Array.isArray(post.likes) ? post.likes.length : 0),
            commentCount: post.commentCount || (Array.isArray(post.comments) ? post.comments.length : 0),
            shareCount: post.shareCount || 0,
            saveCount: post.saveCount || (Array.isArray(post.savedBy) ? post.savedBy.length : 0),
            isLiked: isLiked, // Now properly set based on user's liked posts
            isSaved: isSaved, // Now properly set based on user's saved posts
            createdAt: post.createdAt,
            updatedAt: post.updatedAt
          }
        }
      })
    } catch (error) {
      console.error('Error fetching posts:', error)
      return []
    }
  }

  /**
   * Fetch people suggestions
   */
  private async fetchPeopleSuggestions(
    userData: any,
    limit: number = 1,
    socialCircle: string[] = []
  ): Promise<(PeopleSuggestionItem | NoPeopleSuggestionsItem)[]> {
    if (!this.payload) await this.initializePayload()

    try {
      // Get users who are not in the current user's social circle
      const excludeIds = userData?.id ? [userData.id, ...socialCircle] : []
      
      // Get current user's location for nearby suggestions
      const currentUserLocation = userData?.location?.coordinates
      
      // Build query conditions - ensure current user is always excluded
      const whereConditions: any[] = [
        { id: { not_equals: userData?.id } }, // Always exclude current user
        ...(socialCircle.length > 0 ? [{ id: { not_in: socialCircle } }] : [])
      ]
      
      // Enhanced query to get better people suggestions
      const users = await this.payload.find({
        collection: 'users',
        limit: limit * 3, // Reduced from 5x to 3x for better quality
        depth: 2,
        where: {
          and: whereConditions
        },
        sort: '-createdAt'
      })

      if (!users.docs || users.docs.length === 0) {
        console.log('No users found for people suggestions')
        return []
      }

      // Get current user's following list to calculate mutual connections
      const currentUserFollowing = userData?.following || []
      
      // Enhance users with additional data and sort by relevance
      const enhancedUsers = await Promise.all(
        users.docs.map(async (user: any) => {
          try {
            // Skip if this is the current user
            if (user.id === userData?.id) {
              return null
            }

                  // Skip if current user is already following this user
      if (userData?.following && userData.following.includes(user.id)) {
        console.log(`Skipping user ${user.id} - already being followed`)
        return null
      }

            // Get user's recent posts count
            const postsResult = await this.payload.find({
              collection: 'posts',
              where: {
                author: { equals: user.id },
                status: { equals: 'published' }
              },
              limit: 0
            })

            // Get user's followers count
            const followersResult = await this.payload.find({
              collection: 'users',
              where: {
                following: { contains: user.id }
              },
              limit: 0
            })

            // Calculate mutual connections
            const mutualConnections = currentUserFollowing.filter((followingId: string) => 
              user.following && user.following.includes(followingId)
            ).length

            // Calculate distance if both users have location data
            let distance = null
            if (currentUserLocation && user.location?.coordinates) {
              distance = this.calculateDistance(
                currentUserLocation,
                user.location.coordinates
              )
            }

            // Calculate relevance score with enhanced logic
            let relevanceScore = 0
            
            // Base score from activity
            relevanceScore += (postsResult.totalDocs * 2) // Posts are important
            relevanceScore += (followersResult.totalDocs * 1.5) // Followers show popularity
            
            // Creator bonus
            if (user.isCreator || user.role === 'creator') {
              relevanceScore += 15
            }
            
            // Verification bonus
            if (user.creatorProfile?.verification?.isVerified) {
              relevanceScore += 10
            }
            
            // Mutual connections are very relevant
            relevanceScore += (mutualConnections * 8)
            
            // Nearby users get bonus (closer = higher score)
            if (distance !== null) {
              if (distance < 5) { // Within 5 miles
                relevanceScore += 20
              } else if (distance < 25) { // Within 25 miles
                relevanceScore += 10
              } else if (distance < 100) { // Within 100 miles
                relevanceScore += 5
              }
            }
            
            // Interests overlap bonus
            if (userData?.interests && user.interests) {
              const commonInterests = userData.interests.filter((interest: string) => 
                user.interests.includes(interest)
              )
              relevanceScore += (commonInterests.length * 3)
            }
            
            // Recent activity bonus
            if (user.lastLogin) {
              const daysSinceLastLogin = (Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24)
              if (daysSinceLastLogin < 7) {
                relevanceScore += 5
              } else if (daysSinceLastLogin < 30) {
                relevanceScore += 2
              }
            }

            return {
              user,
              postsCount: postsResult.totalDocs,
              followersCount: followersResult.totalDocs,
              mutualConnections,
              distance,
              relevanceScore
            }
          } catch (error) {
            console.warn(`Failed to enhance user ${user.id}:`, error)
            return null
          }
        })
      )

      // Filter out null values and sort by relevance score
      const validUsers = enhancedUsers.filter(item => item !== null && item.relevanceScore > 0)
      
      // Take only the best suggestions (max 3-4 for better UX)
      const maxSuggestions = Math.min(limit, 4)
      const sortedUsers = validUsers
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxSuggestions)

      // If no valid suggestions found, return a fallback message
      if (sortedUsers.length === 0) {
        console.log('No people suggestions available - user may be following everyone')
        return [{
          id: 'no_people_suggestions',
          type: 'no_people_suggestions',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          priority: 60,
          message: 'You\'re following everyone! New suggestions will appear as more users join.'
        }]
      }

      return await Promise.all(sortedUsers.map(async ({ user, postsCount, followersCount, mutualConnections, distance }) => ({
        id: `people_${user.id}`,
        type: 'people_suggestion',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        priority: 60,
        people: {
          id: user.id,
          name: user.name || 'Anonymous User',
          username: user.username || user.name?.toLowerCase().replace(/\s+/g, '') || 'user',
          bio: user.bio || await this.generateUserBio(user),
          avatar: this.processMediaUrl(user.profileImage || user.avatar) || undefined,
          followersCount: followersCount,
          postsCount: postsCount,
          mutualConnections: mutualConnections,
          isFollowing: false,
          interests: user.interests || [],
          location: user.location ? this.formatUserLocation(user.location) : undefined,
          verified: user.creatorProfile?.verification?.isVerified || false,
          createdAt: user.createdAt,
          // Additional enhanced fields
          isCreator: user.isCreator || user.role === 'creator' || false,
          creatorLevel: user.creatorProfile?.creatorLevel,
          lastActive: user.lastLogin || user.updatedAt,
          averageRating: user.creatorProfile?.stats?.averageRating || 0,
          reviewCount: 0, // Will be calculated separately if needed
          distance: distance ? `${Math.round(distance)} mi away` : undefined
        }
      })))
    } catch (error) {
      console.error('Error fetching people suggestions:', error)
      return []
    }
  }

  /**
   * Generate a personalized bio for users who don't have one
   */
  private async generateUserBio(user: any): Promise<string> {
    const interests = user.interests || []
    const isCreator = user.isCreator || user.role === 'creator' || false
    const isVerified = user.creatorProfile?.verification?.isVerified || false
    
    if (isCreator) {
      return `Local expert and content creator sharing hidden gems and authentic experiences.`
    }
    
    if (isVerified) {
      return `Verified explorer passionate about discovering amazing places and sharing authentic experiences.`
    }
    
    if (interests.length > 0) {
      try {
        // Convert category IDs to names
        const categoryNames = await this.convertCategoryIdsToNames(interests.slice(0, 2))
        if (categoryNames.length > 0) {
          const topInterests = categoryNames.join(' & ')
          return `Passionate about ${topInterests}. Always exploring and sharing amazing discoveries!`
        }
      } catch (error) {
        console.error('Error converting category IDs to names:', error)
        // Fallback to original behavior if conversion fails
        const topInterests = interests.slice(0, 2).join(' & ')
        return `Passionate about ${topInterests}. Always exploring and sharing amazing discoveries!`
      }
    }
    
    return `Passionate explorer sharing amazing discoveries and authentic experiences.`
  }

  /**
   * Convert category IDs to category names
   */
  private async convertCategoryIdsToNames(categoryIds: string[]): Promise<string[]> {
    if (!categoryIds || categoryIds.length === 0) return []
    
    try {
      const categories = await this.payload.find({
        collection: 'categories',
        where: {
          id: { in: categoryIds }
        },
        limit: categoryIds.length,
        depth: 0
      })
      
      return categories.docs.map((cat: any) => cat.name).filter(Boolean)
    } catch (error) {
      console.error('Error fetching category names:', error)
      return []
    }
  }

  /**
   * Format user location for display
   */
  private formatUserLocation(location: any): string {
    if (!location) return ''
    
    const parts = []
    if (location.city) parts.push(location.city)
    if (location.state) parts.push(location.state)
    if (location.country) parts.push(location.country)
    
    return parts.join(', ')
  }

  /**
   * Fetch place recommendations
   */
  private async fetchPlaceRecommendations(
    userData: any,
    limit: number = 2,
    location?: { latitude: number; longitude: number },
    weather?: string,
    timeOfDay?: string
  ): Promise<PlaceRecommendationItem[]> {
    if (!this.payload) await this.initializePayload()

    try {
      const locations = await this.payload.find({
        collection: 'locations',
        limit,
        depth: 2,
        where: {
          and: [
            { status: { equals: 'published' } }
          ]
        },
        sort: '-createdAt'
      })

      if (!locations.docs || locations.docs.length === 0) {
        console.log('No locations found for place recommendations')
        return []
      }

      // Filter out private locations
      const filteredLocations = locations.docs.filter((location: any) => {
        if (location.privacy && location.privacy.toLowerCase() === 'private') {
          return false
        }
        return true
      })

      const theme = this.getPlaceTheme(timeOfDay, weather)

      return filteredLocations.map((location: any) => ({
        id: `place_${location.id}`,
        type: 'place_recommendation',
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
        priority: 70,
        place: {
          id: location.id,
          name: location.name,
          description: location.description || location.shortDescription || '',
          image: this.processMediaUrl(location.featuredImage),
          rating: location.averageRating || 0,
          reviewCount: location.reviewCount || 0,
          categories: location.categories?.map((cat: any) => cat.name || cat) || [],
          location: location.coordinates ? {
            latitude: location.coordinates.latitude,
            longitude: location.coordinates.longitude
          } : undefined,
          address: location.address,
          priceRange: location.priceRange,
          isOpen: this.calculateIsOpen(location.businessHours),
          distance: location.coordinates && userData?.location?.coordinates ? 
            this.calculateDistance(userData.location.coordinates, location.coordinates) : undefined,
          quickTip: this.generateQuickTip(location, timeOfDay, weather),
          theme,
          isSaved: false, // Will be updated by the API
          isSubscribed: false, // Will be updated by the API
          slug: location.slug
        }
      }))
    } catch (error) {
      console.error('Error fetching place recommendations:', error)
      return []
    }
  }

  /**
   * Fetch guide spotlights
   */
  private async fetchGuideSpotlights(
    userData: any,
    limit: number = 1,
    interests: string[] = []
  ): Promise<GuideSpotlightItem[]> {
    if (!this.payload) await this.initializePayload()

    try {
      const guides = await this.payload.find({
        collection: 'guides',
        limit: limit * 2,
        where: {
          status: { equals: 'published' }
        },
        depth: 2,
        sort: '-averageRating'
      })

      const spotlights = guides.docs.slice(0, limit).map((guide: any): GuideSpotlightItem => ({
        id: `guide_spotlight_${guide.id}`,
        type: 'guide_spotlight',
        createdAt: guide.createdAt,
        updatedAt: guide.updatedAt,
        priority: 70,
        guide: {
          id: guide.id,
          title: guide.title,
          description: guide.description,
          coverImage: this.processMediaUrl(guide.coverImage) ? { url: this.processMediaUrl(guide.coverImage)! } : undefined,
          author: {
            id: guide.creator?.id || '',
            name: guide.creator?.name || 'Anonymous',
            avatar: this.processMediaUrl(guide.creator?.avatar || guide.creator?.profileImage) || undefined,
            profileImage: guide.creator?.profileImage && this.processMediaUrl(guide.creator.profileImage)
              ? { url: this.processMediaUrl(guide.creator.profileImage)! }
              : undefined
          },
          price: guide.price || 0,
          rating: guide.averageRating || 0,
          reviewCount: guide.reviewCount || 0,
          purchaseCount: guide.purchaseCount || 0,
          categories: guide.categories?.map((cat: any) => cat.name || cat) || [],
          previewContent: guide.previewContent,
          estimatedReadTime: guide.estimatedReadTime,
          isPurchased: false // Will be updated based on user
        },
        promotionType: this.getPromotionType(guide)
      }))

      return spotlights
    } catch (error) {
      console.error('Error fetching guide spotlights:', error)
      return []
    }
  }

  /**
   * Fetch weekly features
   */
  private async fetchWeeklyFeatures(limit: number = 1): Promise<WeeklyFeatureItem[]> {
    if (!this.payload) await this.initializePayload()

    try {
      const today = new Date()
      const currentWeekNumber = this.getWeekNumber(today)
      const currentYear = today.getFullYear()
      const currentTheme = WEEKLY_THEMES[today.getDay()]

      // Try to get the weekly feature for this exact week and theme
      let weeklyFeature = currentTheme ? await this.payload.find({
        collection: 'weekly-features',
        where: {
          and: [
            { weekNumber: { equals: currentWeekNumber } },
            { year: { equals: currentYear } },
            { theme: { equals: currentTheme.id } },
            { status: { equals: 'published' } },
            { isActive: { equals: true } }
          ]
        },
        limit: 1,
        depth: 3,
        sort: '-publishedAt'
      }) : { docs: [] }

      // If no exact match, get the most recent active weekly feature for this theme
      if (!weeklyFeature.docs || weeklyFeature.docs.length === 0) {
        weeklyFeature = currentTheme ? await this.payload.find({
          collection: 'weekly-features',
          where: {
            and: [
              { theme: { equals: currentTheme.id } },
              { status: { equals: 'published' } },
              { isActive: { equals: true } }
            ]
          },
          limit: 1,
          depth: 3,
          sort: '-publishedAt'
        }) : { docs: [] }
      }

      // If still no match, get any recent active weekly feature
      if (!weeklyFeature.docs || weeklyFeature.docs.length === 0) {
        weeklyFeature = await this.payload.find({
          collection: 'weekly-features',
          where: {
            and: [
              { status: { equals: 'published' } },
              { isActive: { equals: true } }
            ]
          },
          limit: 1,
          depth: 3,
          sort: '-publishedAt'
        })
      }

      // If no weekly features exist at all, return empty array
      if (!weeklyFeature.docs || weeklyFeature.docs.length === 0) {
        console.log('No weekly features found in database')
        return []
      }

      const feature = weeklyFeature.docs[0]

      return [{
        id: `weekly_${feature.id}`,
        type: 'weekly_feature',
        createdAt: feature.createdAt,
        updatedAt: feature.updatedAt,
        priority: 90,
        feature: {
          id: feature.id,
          title: feature.title,
          subtitle: feature.subtitle,
          description: this.extractTextFromRichText(feature.description),
          theme: feature.theme,
          contentType: feature.contentType,
          weekNumber: feature.weekNumber,
          year: feature.year,
          isActive: feature.isActive,
          status: feature.status,
          publishedAt: feature.publishedAt,
          featuredLocations: feature.featuredLocations?.map((location: any) => ({
            id: location.id,
            name: location.name,
            description: location.description,
            image: this.processMediaUrl(location.featuredImage),
            rating: location.averageRating,
            reviewCount: location.reviewCount,
            categories: location.categories?.map((cat: any) => cat.name || cat) || [],
            slug: location.slug
          })) || [],
          featuredPosts: feature.featuredPosts?.map((post: any) => ({
            id: post.id,
            title: post.title,
            content: post.content,
            author: {
              id: post.author?.id,
              name: post.author?.name,
              avatar: this.processMediaUrl(post.author?.profileImage || post.author?.avatar)
            },
            image: this.processMediaUrl(post.featuredImage || post.image),
            createdAt: post.createdAt
          })) || [],
          featuredGuides: feature.featuredGuides?.map((guide: any) => ({
            id: guide.id,
            title: guide.title,
            description: guide.description,
            author: {
              id: guide.author?.id,
              name: guide.author?.name,
              avatar: this.processMediaUrl(guide.author?.profileImage || guide.author?.avatar)
            },
            coverImage: this.processMediaUrl(guide.coverImage),
            pricing: guide.pricing,
            rating: guide.averageRating,
            reviewCount: guide.reviewCount
          })) || [],
          challenge: feature.challenge && feature.challenge.title && feature.challenge.description && feature.challenge.difficulty && feature.challenge.duration
            ? {
                title: feature.challenge.title,
                description: feature.challenge.description,
                difficulty: feature.challenge.difficulty,
                duration: feature.challenge.duration,
                reward: feature.challenge.reward,
                targetCount: feature.challenge.targetCount,
                expiresAt: feature.challenge.expiresAt
              }
            : undefined,
          // analytics property removed to match expected type
        }
      }]
    } catch (error) {
      console.error('Error fetching weekly features:', error)
      return []
    }
  }

  /**
   * Fetch challenges
   */
  private async fetchChallenges(
    userData: any,
    limit: number = 1,
    interests: string[] = []
  ): Promise<ChallengeCardItem[]> {
    // TODO: Implement with challenges collection when available
    // For now, return empty array to avoid showing placeholder data
    console.log('Challenges feature coming soon - returning empty array')
    return []
  }

  /**
   * Fetch mini blog cards
   */
  private async fetchMiniBlogCards(
    userData: any,
    limit: number = 2,
    interests: string[] = []
  ): Promise<MiniBlogCardItem[]> {
    if (!this.payload) await this.initializePayload()

    try {
      const posts = await this.payload.find({
        collection: 'posts',
        limit,
        depth: 2,
        where: {
          and: [
            { status: { equals: 'published' } },
            { type: { in: ['blog', 'article', 'story'] } }
          ]
        },
        sort: '-createdAt'
      })

      if (!posts.docs || posts.docs.length === 0) {
        console.log('No blog posts found for mini blog cards')
        return []
      }

      return posts.docs.map((post: any) => ({
        id: `blog_${post.id}`,
        type: 'mini_blog_card',
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        priority: 65,
        blog: {
          id: post.id,
          title: post.title || 'Untitled Post',
          excerpt: this.extractTextFromRichText(post.content || post.description || '').substring(0, 120) + '...',
          author: {
            id: post.author?.id || '',
            name: post.author?.name || 'Anonymous',
            avatar: this.processMediaUrl(post.author?.profileImage || post.author?.avatar)
          },
          image: this.processMediaUrl(post.featuredImage || post.image),
          readTime: this.calculateReadTime(post.content || post.description || ''),
          category: post.category || 'Travel',
          tags: post.tags?.map((tag: any) => typeof tag === 'string' ? tag : tag.tag) || [],
          likeCount: post.likeCount || 0,
          commentCount: post.commentCount || 0,
          isLiked: false, // Will be updated by the API
          isSaved: false, // Will be updated by the API
          createdAt: post.createdAt
        }
      }))
    } catch (error) {
      console.error('Error fetching mini blog cards:', error)
      return []
    }
  }

  /**
   * Intelligently shuffle items to create an engaging feed
   */
  private intelligentShuffle(items: FeedItem[]): FeedItem[] {
    // Sort by priority first
    items.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

    // Then apply intelligent distribution
    const result: FeedItem[] = []
    const posts = items.filter(item => item.type === 'post')
    const nonPosts = items.filter(item => item.type !== 'post')

    let postIndex = 0
    let nonPostIndex = 0

    // Distribute content with posts as the backbone
    for (let i = 0; i < items.length; i++) {
      if (i % 4 === 0 && nonPostIndex < nonPosts.length) {
        // Every 4th item is non-post content
        const item = nonPosts[nonPostIndex++]
        if (item) result.push(item)
      } else if (postIndex < posts.length) {
        const item = posts[postIndex++]
        if (item) result.push(item)
      } else if (nonPostIndex < nonPosts.length) {
        const item = nonPosts[nonPostIndex++]
        if (item) result.push(item)
      }
    }

    return result
  }

  // Helper methods
  private getTimeOfDay(): string {
    const hour = new Date().getHours()
    if (hour < 6) return 'night'
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    if (hour < 22) return 'evening'
    return 'night'
  }

  private calculatePostPriority(post: any, userId?: string, interests: string[] = []): number {
    let priority = 50 // Base priority
    
    // Boost based on engagement
    priority += Math.min((post.likeCount || 0) / 10, 20)
    priority += Math.min((post.commentCount || 0) / 5, 15)
    
    // Boost if matches interests
    if (interests.some(interest => 
      post.categories?.some((cat: any) => 
        (cat.name || cat).toLowerCase().includes(interest.toLowerCase())
      )
    )) {
      priority += 10
    }
    
    // Boost recent content
    const hoursSinceCreated = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60)
    if (hoursSinceCreated < 24) priority += 15
    else if (hoursSinceCreated < 72) priority += 10
    
    return Math.min(priority, 100)
  }

  private calculateMutualConnections(userId: string, socialCircle: string[]): number {
    // Simple mock - in production, would calculate actual mutual connections
    return Math.floor(Math.random() * 5)
  }

  /**
   * Calculate distance between two coordinate points using Haversine formula
   */
  private calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 3959 // Earth's radius in miles
    const dLat = this.deg2rad(point2.latitude - point1.latitude)
    const dLon = this.deg2rad(point2.longitude - point1.longitude)
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(point1.latitude)) * Math.cos(this.deg2rad(point2.latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c
    return distance
  }

  /**
   * Convert degrees to radians
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180)
  }

  private calculateIsOpen(businessHours: any): boolean {
    // Simple mock - in production, would check actual business hours
    return Math.random() > 0.3 // 70% chance of being open
  }

  private generateQuickTip(place: any, timeOfDay?: string, weather?: string): string {
    const tips = [
      'Perfect for a quiet moment',
      'Great for photos',
      'Don\'t miss the signature dish',
      'Best time to visit is early morning',
      'Popular with locals'
    ]
    return tips[Math.floor(Math.random() * tips.length)] || ''
  }

  private getPeopleSuggestionTitle(count: number): string {
    const titles = [
      'Discover Local Explorers',
      'Connect with Fellow Adventurers',
      'Meet Amazing People',
      'Expand Your Network'
    ]
    return titles[Math.floor(Math.random() * titles.length)] || ''
  }

  private getPlaceRecommendationTitle(timeOfDay?: string, weather?: string): string {
    if (timeOfDay === 'morning') return 'Perfect Morning Spots'
    if (timeOfDay === 'evening') return 'Evening Favorites'
    if (weather === 'rainy') return 'Cozy Indoor Places'
    return 'Hidden Gems Near You'
  }

  private getPlaceRecommendationSubtitle(count: number, location?: any): string {
    return location ? `${count} amazing places nearby` : `${count} places you might love`
  }

  private getPlaceTheme(timeOfDay?: string, weather?: string): 'nearby' | 'trending' | 'hidden_gems' | 'weather_based' {
    if (weather) return 'weather_based'
    if (timeOfDay === 'morning' || timeOfDay === 'evening') return 'nearby'
    return 'hidden_gems'
  }

  private getPromotionType(guide: any): 'featured' | 'new_release' | 'bestseller' | 'trending' {
    const daysSinceCreated = (Date.now() - new Date(guide.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreated < 7) return 'new_release'
    if (guide.purchaseCount > 100) return 'bestseller'
    if (guide.averageRating > 4.5) return 'featured'
    return 'trending'
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  private getWeeklyFeatureDescription(theme: any): string {
    const descriptions = {
      'sunday_serenity': 'Discover peaceful places to unwind and recharge for the week ahead.',
      'monday_motivation': 'Start your week with inspiring places and uplifting stories.',
      'tuesday_tips': 'Learn insider secrets and local knowledge from experienced explorers.',
      'wednesday_wanderlust': 'Dream big with destinations that spark your travel imagination.',
      'thursday_throwback': 'Explore places with rich history and nostalgic charm.',
      'friday_fun': 'Get ready for the weekend with exciting entertainment options.',
      'weekend_warriors': 'Fuel your adventurous spirit with thrilling activities and challenges.'
    }
    return descriptions[theme.id as keyof typeof descriptions] || theme.description
  }

  private extractTextFromRichText(richText: any): string {
    if (typeof richText === 'string') {
      // If it's already a string, clean HTML tags
      return richText.replace(/<[^>]+>/g, '').trim()
    }
    
    if (!richText || !richText.root || !richText.root.children) {
      return ''
    }
    
    // Extract text from Lexical/PayloadCMS rich text format
    const extractText = (children: any[]): string => {
      return children.map((child: any) => {
        if (child.type === 'text') {
          return child.text || ''
        }
        if (child.children && Array.isArray(child.children)) {
          return extractText(child.children)
        }
        return ''
      }).join(' ')
    }
    
    return extractText(richText.root.children).trim()
  }

  private calculateReadTime(content: string): number {
    // This is a placeholder implementation. In a real application, you might want to
    // implement a more accurate read time calculation based on the content's length,
    // the average reading speed of the user, and the complexity of the content.
    return Math.ceil(content.length / 200) // Assuming 200 words per minute
  }

  /**
   * Sort feed items based on algorithm
   */
  private sortFeedItems(
    items: FeedItem[],
    sortBy: string,
    userId?: string,
    interests: string[] = [],
    location?: { latitude: number; longitude: number }
  ): FeedItem[] {
    const now = Date.now()
    
    return items.sort((a, b) => {
      // Primary sort: priority (higher is better)
      if ((a.priority ?? 0) !== (b.priority ?? 0)) {
        return (b.priority ?? 0) - (a.priority ?? 0)
      }
      
      // Secondary sort based on sortBy parameter
      switch (sortBy) {
        case 'recent':
        case 'chronological':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          
        case 'popular':
          // Sort by engagement for posts, or default to recent for other types
          if (a.type === 'post' && b.type === 'post') {
            const aEngagement = (a.post?.likeCount || 0) + (a.post?.commentCount || 0) + (a.post?.shareCount || 0)
            const bEngagement = (b.post?.likeCount || 0) + (b.post?.commentCount || 0) + (b.post?.shareCount || 0)
            return bEngagement - aEngagement
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          
        case 'recommended':
        default:
          // Advanced recommendation algorithm
          const aScore = this.calculateRecommendationScore(a, userId, interests, location, now)
          const bScore = this.calculateRecommendationScore(b, userId, interests, location, now)
          return bScore - aScore
      }
    })
  }

  /**
   * Calculate recommendation score for an item
   */
  private calculateRecommendationScore(
    item: FeedItem,
    userId?: string,
    interests: string[] = [],
    location?: { latitude: number; longitude: number },
    now: number = Date.now()
  ): number {
    let score = item.priority || 0
    
    // Recency boost (more recent = higher score)
    const itemAge = now - new Date(item.createdAt).getTime()
    const daysSinceCreated = itemAge / (1000 * 60 * 60 * 24)
    const recencyScore = Math.max(0, 10 - (daysSinceCreated / 7)) // Decay over weeks
    score += recencyScore
    
    // Engagement boost for posts
    if (item.type === 'post' && item.post) {
      const engagementScore = Math.log10(
        1 + (item.post.likeCount || 0) + 
        (item.post.commentCount || 0) * 2 + // Comments worth more
        (item.post.shareCount || 0) * 3     // Shares worth most
      )
      score += engagementScore
    }
    
    // Interest matching boost
    if (interests.length > 0) {
      let interestMatch = 0
      
      if (item.type === 'post' && item.post?.tags) {
        const matchingTags = item.post.tags.filter(tag => 
          interests.some(interest => 
            interest.toLowerCase().includes(tag.toLowerCase()) || 
            tag.toLowerCase().includes(interest.toLowerCase())
          )
        )
        interestMatch = matchingTags.length / interests.length
      }
      
      score += interestMatch * 5 // Boost for interest matches
    }
    
    // Location proximity boost
    if (location && item.type === 'place_recommendation' && item.place?.location) {
      const distance = this.calculateDistance(location, item.place.location)
      if (distance !== null && distance < 50) { // Within 50km
        const proximityScore = Math.max(0, 5 - (distance / 10)) // Closer = higher score
        score += proximityScore
      }
    }
    
    return score
  }
}

// Export singleton instance
export const feedAlgorithm = new FeedAlgorithm() 