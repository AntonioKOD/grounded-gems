import { getPayload } from 'payload'
import config from '@/payload.config'
import type { 
  FeedItem, 
  FeedMixConfig, 
  FeedAlgorithmParams, 
  WeeklyTheme, 
  PostFeedItem,
  PeopleSuggestionItem,
  PlaceRecommendationItem,
  GuideSpotlightItem,
  MiniBlogItem,
  WeeklyFeatureItem,
  ChallengeCardItem,
  MiniBlogCardItem
} from '@/types/feed'
import { WEEKLY_THEMES } from '@/types/feed'

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

export class FeedAlgorithm {
  private payload: any

  constructor() {
    this.initializePayload()
  }

  private async initializePayload() {
    this.payload = await getPayload({ config })
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

      // Fetch all content types in parallel
      const [
        posts,
        weeklyFeatures,
        peopleSuggestions,
        placeRecommendations,
        miniBlogCards
      ] = await Promise.all([
        this.fetchPosts(userId, Math.ceil(limit * 0.6), page, location, interests),
        this.fetchWeeklyFeatures(1),
        this.fetchPeopleSuggestions(userId, 1, socialCircle),
        this.fetchPlaceRecommendations(userId, 2, location, weather, timeOfDay),
        this.fetchMiniBlogCards(userId, 2, interests)
      ])

      console.log('📊 Fetched content counts:', {
        posts: posts.length,
        weeklyFeatures: weeklyFeatures.length,
        peopleSuggestions: peopleSuggestions.length,
        placeRecommendations: placeRecommendations.length,
        miniBlogCards: miniBlogCards.length
      })

      // Combine all content
      let allItems: FeedItem[] = [
        ...posts,
        ...weeklyFeatures,
        ...peopleSuggestions,
        ...placeRecommendations,
        ...miniBlogCards
      ]

      // Apply filters
      if (filters.excludeTypes && filters.excludeTypes.length > 0) {
        allItems = allItems.filter(item => !filters.excludeTypes!.includes(item.type))
      }

      if (filters.includeTypes && filters.includeTypes.length > 0) {
        allItems = allItems.filter(item => filters.includeTypes!.includes(item.type))
      }

      // Sort items based on algorithm
      allItems = this.sortFeedItems(allItems, sortBy, userId, interests, location)

      // Apply pagination
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedItems = allItems.slice(startIndex, endIndex)

      console.log('✅ Generated feed with', paginatedItems.length, 'items')

      return paginatedItems
    } catch (error) {
      console.error('❌ Error generating feed:', error)
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
        mix[key as keyof FeedMixConfig] = Math.max(0, mix[key as keyof FeedMixConfig] + adjustment)
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
    userId?: string,
    limit: number = 10,
    page: number = 1,
    location?: { latitude: number; longitude: number },
    interests: string[] = []
  ): Promise<PostFeedItem[]> {
    if (!this.payload) await this.initializePayload()

    try {
      // Get user's liked and saved posts if userId is provided
      let userLikedPosts: string[] = []
      let userSavedPosts: string[] = []
      
      if (userId) {
        try {
          const user = await this.payload.findByID({
            collection: 'users',
            id: userId,
            depth: 0
          })
          
          if (user) {
            userLikedPosts = Array.isArray(user.likedPosts) ? user.likedPosts : []
            userSavedPosts = Array.isArray(user.savedPosts) ? user.savedPosts : []
          }
        } catch (userError) {
          console.log('Could not fetch user data for post interactions:', userError)
        }
      }

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

      return posts.docs.map((post: any) => {
        // Check if user has liked or saved this post
        const isLiked = userLikedPosts.includes(post.id)
        const isSaved = userSavedPosts.includes(post.id)
        
        return {
          id: `post_${post.id}`,
          type: 'post',
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          priority: this.calculatePostPriority(post, userId, interests),
          post: {
            id: post.id,
            content: post.content || '',
            title: post.title,
            author: {
              id: post.author?.id || '',
              name: post.author?.name || 'Anonymous',
              avatar: post.author?.avatar?.url,
              profileImage: post.author?.profileImage
            },
            image: post.featuredImage?.url || post.image?.url,
            video: post.video?.url,
            photos: post.photos?.map((photo: any) => photo.url || photo) || [],
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
    userId?: string,
    limit: number = 1,
    socialCircle: string[] = []
  ): Promise<PeopleSuggestionItem[]> {
    if (!this.payload) await this.initializePayload()

    try {
      // Get users who are not in the current user's social circle
      const excludeIds = userId ? [userId, ...socialCircle] : []
      
      const users = await this.payload.find({
        collection: 'users',
        limit,
        depth: 1,
        where: {
          and: [
            ...(excludeIds.length > 0 ? [{ id: { not_in: excludeIds } }] : [])
          ]
        },
        sort: '-createdAt'
      })

      if (!users.docs || users.docs.length === 0) {
        console.log('No users found for people suggestions')
        return []
      }

      return users.docs.map((user: any) => ({
        id: `people_${user.id}`,
        type: 'people_suggestion',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        priority: 60,
        people: {
          id: user.id,
          name: user.name || 'Anonymous User',
          username: user.username || user.name?.toLowerCase().replace(/\s+/g, '') || 'user',
          bio: user.bio || 'Passionate explorer sharing amazing discoveries',
          avatar: user.profileImage?.url || user.avatar?.url,
          followersCount: user.followersCount || 0,
          postsCount: user.postsCount || 0,
          mutualConnections: this.calculateMutualConnections(user.id, socialCircle),
          isFollowing: false,
          interests: user.interests || [],
          location: user.location || null,
          verified: user.verified || false,
          createdAt: user.createdAt
        }
      }))
    } catch (error) {
      console.error('Error fetching people suggestions:', error)
      return []
    }
  }

  /**
   * Fetch place recommendations
   */
  private async fetchPlaceRecommendations(
    userId?: string,
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

      const theme = this.getPlaceTheme(timeOfDay, weather)

      return locations.docs.map((location: any) => ({
        id: `place_${location.id}`,
        type: 'place_recommendation',
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
        priority: 70,
        place: {
          id: location.id,
          name: location.name,
          description: location.description || location.shortDescription || '',
          image: location.featuredImage?.url,
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
          distance: location.coordinates && location ? 
            this.calculateDistance(location, location.coordinates) : undefined,
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
    userId?: string,
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
          coverImage: guide.coverImage,
          author: {
            id: guide.creator?.id || '',
            name: guide.creator?.name || 'Anonymous',
            avatar: guide.creator?.avatar?.url,
            profileImage: guide.creator?.profileImage
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
      let weeklyFeature = await this.payload.find({
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
      })

      // If no exact match, get the most recent active weekly feature for this theme
      if (!weeklyFeature.docs || weeklyFeature.docs.length === 0) {
        weeklyFeature = await this.payload.find({
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
        })
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
          coverImage: feature.coverImage?.url ? {
            url: feature.coverImage.url,
            alt: feature.coverImage.alt
          } : null,
          gallery: feature.gallery?.map((item: any) => ({
            url: item.image?.url,
            caption: item.caption,
            alt: item.image?.alt
          })).filter((item: any) => item.url) || [],
          featuredLocations: feature.featuredLocations?.map((location: any) => ({
            id: location.id,
            name: location.name,
            description: location.description,
            image: location.featuredImage?.url,
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
              avatar: post.author?.profileImage?.url || post.author?.avatar?.url
            },
            image: post.featuredImage?.url || post.image?.url,
            createdAt: post.createdAt
          })) || [],
          featuredGuides: feature.featuredGuides?.map((guide: any) => ({
            id: guide.id,
            title: guide.title,
            description: guide.description,
            author: {
              id: guide.author?.id,
              name: guide.author?.name,
              avatar: guide.author?.profileImage?.url || guide.author?.avatar?.url
            },
            coverImage: guide.coverImage?.url,
            pricing: guide.pricing,
            rating: guide.averageRating,
            reviewCount: guide.reviewCount
          })) || [],
          challenge: feature.challenge ? {
            title: feature.challenge.title,
            description: feature.challenge.description,
            difficulty: feature.challenge.difficulty,
            duration: feature.challenge.duration,
            reward: feature.challenge.reward,
            targetCount: feature.challenge.targetCount,
            expiresAt: feature.challenge.expiresAt
          } : null,
          analytics: feature.analytics || {
            viewCount: 0,
            engagementCount: 0,
            participantCount: 0,
            shareCount: 0
          },
          themeConfig: currentTheme,
          createdAt: feature.createdAt,
          updatedAt: feature.updatedAt
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
    userId?: string,
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
    userId?: string,
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
            avatar: post.author?.profileImage?.url || post.author?.avatar?.url
          },
          image: post.featuredImage?.url || post.image?.url,
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
    items.sort((a, b) => (b.priority || 0) - (a.priority || 0))

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
        result.push(nonPosts[nonPostIndex++])
      } else if (postIndex < posts.length) {
        result.push(posts[postIndex++])
      } else if (nonPostIndex < nonPosts.length) {
        result.push(nonPosts[nonPostIndex++])
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

  private calculateDistance(
    userLocation: { latitude: number; longitude: number },
    placeLocation: any
  ): number {
    if (!placeLocation?.latitude || !placeLocation?.longitude) return 0
    
    // Simple distance calculation (Haversine formula would be more accurate)
    const latDiff = userLocation.latitude - placeLocation.latitude
    const lonDiff = userLocation.longitude - placeLocation.longitude
    return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111 // Rough km conversion
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
    return tips[Math.floor(Math.random() * tips.length)]
  }

  private getPeopleSuggestionTitle(count: number): string {
    const titles = [
      'Discover Local Explorers',
      'Connect with Fellow Adventurers',
      'Meet Amazing People',
      'Expand Your Network'
    ]
    return titles[Math.floor(Math.random() * titles.length)]
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
      if (a.priority !== b.priority) {
        return b.priority - a.priority
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