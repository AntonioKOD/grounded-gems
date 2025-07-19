export interface User {
    id: string
    name: string
    avatar?: string
    bio?: string
    followerCount?: number
    followingCount?: number
    isFollowing?: boolean
    status?: string
    profileImage?: { url: string }
  }
  
  export interface Location {
    id: string
    name: string
    address?: string
    image?: string
  }
  
  export interface Post {
    id: string
    content: string
    title?: string
    author: {
      id: string
      name: string
      avatar?: string
      profileImage?: {
        url: string
      }
    }
    image?: string
    video?: string
    photos?: string[]
    location?: {
      id: string
      name: string
      slug?: string
    } | string
    type: string
    rating?: number
    tags: string[]
    likeCount: number
    commentCount: number
    shareCount: number
    saveCount: number
    isLiked: boolean
    isSaved: boolean
    createdAt: string
    updatedAt: string
  }
  
  export interface Comment {
    id: string
    content: string
    author: {
      id: string
      name: string
      avatar?: string
    }
    createdAt: string
    likeCount?: number
    isLiked?: boolean
  }
  
  // Enhanced feed content types
  export type FeedContentType = 
    | 'post' 
    | 'people_suggestion' 
    | 'place_recommendation' 
    | 'guide_spotlight' 
    | 'weekly_feature'
    | 'story_highlight'
    | 'event_suggestion'
    | 'challenge_card'
    | 'mini_blog_card'
  
  export interface BaseFeedItem {
    id: string
    type: FeedContentType
    createdAt: string
    updatedAt: string
    priority?: number // For feed ordering
    isSponsored?: boolean
    expiresAt?: string // For temporary content
  }
  
  export interface PostFeedItem extends BaseFeedItem {
    type: 'post'
    post: Post
  }
  
  export interface PeopleSuggestionItem extends BaseFeedItem {
    type: 'people_suggestion'
    people: {
      id: string
      name: string
      username: string
      bio: string
      avatar?: string
      followersCount: number
      postsCount: number
      mutualConnections: number
      isFollowing: boolean
      interests: string[]
      location?: string
      verified: boolean
      createdAt: string
      // Enhanced fields
      isCreator?: boolean
      creatorLevel?: string
      lastActive?: string
      averageRating?: number
      reviewCount?: number
      distance?: string
    }
  }
  
  export interface PlaceRecommendationItem extends BaseFeedItem {
    type: 'place_recommendation'
    place: {
      id: string
      name: string
      description: string
      image?: string
      rating: number
      reviewCount: number
      categories: string[]
      location?: {
        latitude: number
        longitude: number
      }
      address?: string
      priceRange?: string
      isOpen?: boolean
      distance?: number
      quickTip?: string
      theme: string
      isSaved: boolean
      isSubscribed: boolean
      slug?: string
    }
  }
  
  export interface GuideSpotlightItem extends BaseFeedItem {
    type: 'guide_spotlight'
    guide: {
      id: string
      title: string
      description: string
      coverImage?: { url: string }
      author: {
        id: string
        name: string
        avatar?: string
        profileImage?: { url: string }
      }
      price: number
      rating: number
      reviewCount: number
      purchaseCount: number
      categories: string[]
      previewContent?: string
      estimatedReadTime?: number
      isPurchased?: boolean
    }
    promotionType?: 'featured' | 'new_release' | 'bestseller' | 'trending'
  }
  
  export interface WeeklyFeatureItem extends BaseFeedItem {
    type: 'weekly_feature'
    feature: {
      id: string
      title: string
      subtitle?: string
      description: string
      theme: string
      weekNumber: number
      year: number
      contentType: 'places' | 'stories' | 'tips' | 'challenges' | 'mixed'
      isActive: boolean
      status: 'published' | 'draft' | 'archived'
      
      // Featured content
      featuredLocations?: Array<{
        id: string
        name: string
        description?: string
        image?: string
        rating?: number
        address?: string
        slug?: string
      }>
      
      featuredPosts?: Array<{
        id: string
        title: string
        content?: string
        author: {
          id: string
          name: string
          avatar?: string
        }
        image?: string
        likeCount: number
        createdAt: string
      }>
      
      featuredGuides?: Array<{
        id: string
        title: string
        description?: string
        author: {
          id: string
          name: string
          avatar?: string
        }
        coverImage?: string
        rating?: number
        price?: number
      }>
      
      // Challenge system
      challenge?: {
        title: string
        description: string
        difficulty: 'easy' | 'medium' | 'hard'
        duration: string
        reward?: {
          type: 'badge' | 'points' | 'discount' | 'access'
          value: string
        }
        targetCount?: number
        expiresAt?: string
      }
      
      // Engagement metrics
      participantCount?: number
      likeCount?: number
      viewCount?: number
      shareCount?: number
      
      // Additional metadata
      isAutoGenerated?: boolean
      isFallback?: boolean
      publishedAt?: string
      
      // Content metadata
      content?: {
        type: string
        items: any[]
      }
    }
  }
  
  export interface ChallengeCardItem extends BaseFeedItem {
    type: 'challenge_card'
    challenge: {
      id: string
      title: string
      description: string
      type: 'photo' | 'exploration' | 'social' | 'achievement'
      difficulty: 'easy' | 'medium' | 'hard'
      duration: string // "1 week", "3 days", etc.
      reward: {
        type: 'badge' | 'points' | 'discount'
        value: string
      }
      progress?: {
        current: number
        total: number
        percentage: number
      }
      participants: number
      isParticipating?: boolean
      coverImage?: { url: string }
      expiresAt: string
    }
  }
  
  export interface MiniBlogCardItem extends BaseFeedItem {
    type: 'mini_blog_card'
    blog: {
      id: string
      title: string
      excerpt: string
      author: {
        id: string
        name: string
        avatar?: string
      }
      image?: string
      readTime: number
      category: string
      tags: string[]
      likeCount: number
      commentCount: number
      isLiked: boolean
      isSaved: boolean
      createdAt: string
    }
  }
  
  export type FeedItem = 
    | PostFeedItem 
    | PeopleSuggestionItem 
    | PlaceRecommendationItem 
    | GuideSpotlightItem 
    | WeeklyFeatureItem
    | ChallengeCardItem
    | MiniBlogCardItem
  
  // Feed algorithm configuration
  export interface FeedMixConfig {
    posts: number // 70%
    peopleSuggestions: number // 10%
    placeRecommendations: number // 10%
    guideSpotlights: number // 5%
    weeklyFeatures: number // 3%
    challenges: number // 2%
  }
  
  export interface FeedAlgorithmParams {
    userId?: string
    location?: {
      latitude: number
      longitude: number
    }
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
    weather?: string
    interests?: string[]
    recentActivity?: string[]
    socialCircle?: string[]
  }
  
  // Weekly themes
  export const WEEKLY_THEMES = [
    { 
      id: 'sunday_serenity', 
      name: 'Sunday Serenity', 
      emoji: '🧘‍♀️',
      description: 'Peaceful and relaxing content to end the week',
      keywords: ['peaceful', 'calm', 'serene', 'quiet', 'mindful', 'relaxing'],
      color: '#4ECDC4'
    },
    { 
      id: 'monday_motivation', 
      name: 'Monday Motivation', 
      emoji: '💪',
      description: 'Inspirational content to start the week strong',
      keywords: ['motivation', 'inspiring', 'energy', 'fitness', 'adventure', 'goals'],
      color: '#FF6B6B'
    },
    { 
      id: 'tuesday_tips', 
      name: 'Tuesday Tips', 
      emoji: '💡',
      description: 'Practical tips and educational content',
      keywords: ['tips', 'advice', 'howto', 'guide', 'learn', 'practical'],
      color: '#FFE66D'
    },
    { 
      id: 'wednesday_wanderlust', 
      name: 'Wednesday Wanderlust', 
      emoji: '🗺️',
      description: 'Travel inspiration and discovery',
      keywords: ['travel', 'explore', 'discover', 'wanderlust', 'journey', 'destination'],
      color: '#845EC2'
    },
    { 
      id: 'thursday_throwback', 
      name: 'Thursday Throwback', 
      emoji: '📸',
      description: 'Historical and nostalgic content',
      keywords: ['historic', 'vintage', 'nostalgia', 'heritage', 'culture', 'classic'],
      color: '#8B4513'
    },
    { 
      id: 'friday_fun', 
      name: 'Friday Fun', 
      emoji: '🎉',
      description: 'Entertainment and social content',
      keywords: ['fun', 'entertainment', 'social', 'nightlife', 'party', 'events'],
      color: '#FF69B4'
    },
    { 
      id: 'weekend_warriors', 
      name: 'Weekend Warriors', 
      emoji: '⚡',
      description: 'Adventure and outdoor activities',
      keywords: ['adventure', 'outdoor', 'hiking', 'sports', 'active', 'weekend'],
      color: '#DC143C'
    }
  ] as const
  