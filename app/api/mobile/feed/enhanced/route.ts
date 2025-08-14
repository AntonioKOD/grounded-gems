import { NextRequest, NextResponse } from 'next/server'
import { getServerSideUser } from '@/lib/auth-server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Enhanced feed recommendation algorithm
interface FeedItemScore {
  item: any
  score: number
  factors: {
    userInterestMatch: number
    locationRelevance: number
    timeRelevance: number
    popularityScore: number
    userBehaviorScore: number
    diversityScore: number
  }
}

interface UserFeedPreferences {
  categories: string[]
  savedLocations: string[]
  likedPosts: string[]
  followedUsers: string[]
  location?: {
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  interactionHistory: Array<{
    itemId: string
    type: 'post' | 'location' | 'event'
    action: 'like' | 'save' | 'share' | 'comment'
    timestamp: Date
  }>
}

// Calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const distance = R * c
  // Round to 2 decimal places to avoid Swift JSON decoding issues
  return Math.round(distance * 100) / 100
}

function calculateUserInterestMatch(item: any, userPrefs: UserFeedPreferences): number {
  if (userPrefs.categories.length === 0 || !item.categories) return 0.5
  
  const itemCategories = item.categories.map((cat: any) => 
    typeof cat === 'string' ? cat.toLowerCase() : cat.name?.toLowerCase()
  )
  const matches = userPrefs.categories.filter(userCat => 
    itemCategories.some((itemCat: string) => itemCat.includes(userCat.toLowerCase()))
  )
  return matches.length / userPrefs.categories.length
}

function calculateLocationRelevance(item: any, userPrefs: UserFeedPreferences): number {
  const userLat = userPrefs.location?.coordinates?.latitude
  const userLng = userPrefs.location?.coordinates?.longitude
  
  if (!userLat || !userLng || !item.location?.coordinates) return 1.0
  
  const distance = calculateDistance(
    userLat, userLng, 
    item.location.coordinates.latitude, item.location.coordinates.longitude
  )
  // Exponential decay based on distance (25km radius)
  return Math.exp(-distance / 25)
}

function calculatePopularityScore(item: any): number {
  const likeCount = item.likeCount || item.engagement?.likeCount || 0
  const commentCount = item.commentCount || item.engagement?.commentCount || 0
  const saveCount = item.saveCount || item.engagement?.saveCount || 0
  return Math.min(2.0, 1.0 + (likeCount / 50) + (commentCount / 20) + (saveCount / 30))
}

// Get time-based relevance score for feed items
function getTimeRelevanceScore(item: any): number {
  const now = new Date()
  const hour = now.getHours()
  const itemDate = new Date(item.createdAt || item.publishedAt || now)
  const hoursSinceCreation = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60)
  
  // Boost for recent content
  let timeBoost = 1.0
  if (hoursSinceCreation < 1) timeBoost = 1.3
  else if (hoursSinceCreation < 6) timeBoost = 1.2
  else if (hoursSinceCreation < 24) timeBoost = 1.1
  else if (hoursSinceCreation > 168) timeBoost = 0.8 // Reduce score for content older than a week
  
  // Time-based content relevance
  const content = (item.content || item.description || '').toLowerCase()
  const categories = item.categories || []
  
  if (hour >= 6 && hour <= 11 && (
    content.includes('breakfast') || 
    content.includes('coffee') || 
    categories.some((cat: any) => cat.toLowerCase().includes('breakfast'))
  )) {
    return timeBoost * 1.1
  }
  
  if (hour >= 11 && hour <= 15 && (
    content.includes('lunch') || 
    content.includes('restaurant') ||
    categories.some((cat: any) => cat.toLowerCase().includes('lunch'))
  )) {
    return timeBoost * 1.1
  }
  
  if (hour >= 17 && hour <= 22 && (
    content.includes('dinner') || 
    content.includes('restaurant') ||
    content.includes('bar') ||
    categories.some((cat: any) => cat.toLowerCase().includes('dinner'))
  )) {
    return timeBoost * 1.1
  }
  
  return timeBoost
}

// Calculate user behavior score based on interaction history
function calculateUserBehaviorScore(item: any, userPrefs: UserFeedPreferences): number {
  let score = 1.0
  
  // Check if user has interacted with similar content
  const itemCategories = item.categories || []
  const similarInteractions = userPrefs.interactionHistory.filter(interaction => {
    // This would need to be enhanced with actual item data lookup
    return interaction.action === 'like' || interaction.action === 'save'
  })
  
  if (similarInteractions.length > 0) {
    score += 0.2
  }
  
  // Check if user has liked this specific item
  if (userPrefs.likedPosts.includes(item.id)) {
    score += 0.3
  }
  
  // Check if user follows the author
  if (item.author && userPrefs.followedUsers.includes(item.author.id)) {
    score += 0.4
  }
  
  // Check if item mentions a saved location
  if (item.location && userPrefs.savedLocations.includes(item.location.id)) {
    score += 0.3
  }
  
  return score
}

// Calculate diversity score to avoid showing too many similar items
function calculateDiversityScore(item: any, recommendedItems: any[]): number {
  const itemCategory = item.categories?.[0]?.toLowerCase() || ''
  const itemAuthor = item.author?.id || ''
  
  const similarCategoryCount = recommendedItems.filter(rec => 
    rec.categories?.[0]?.toLowerCase() === itemCategory
  ).length
  
  const sameAuthorCount = recommendedItems.filter(rec => 
    rec.author?.id === itemAuthor
  ).length
  
  // Reduce score if we already have many items of this category or from this author
  return Math.max(0.5, 1.0 - (similarCategoryCount * 0.05) - (sameAuthorCount * 0.1))
}

// Add content filtering function
function filterObjectionableContent(items: any[]): any[] {
  const objectionableKeywords = [
    'spam', 'scam', 'fake', 'clickbait', 'inappropriate', 'offensive',
    'harassment', 'bullying', 'hate', 'violence', 'explicit'
  ]
  
  return items.filter(item => {
    // Check content text
    const content = (item.content || item.caption || item.title || '').toLowerCase()
    const hasObjectionableContent = objectionableKeywords.some(keyword => 
      content.includes(keyword)
    )
    
    // Check if content has been reported multiple times
    const reportCount = item.reportCount || 0
    const isFrequentlyReported = reportCount > 5
    
    // Check if author is blocked or suspended
    const authorStatus = item.author?.status || 'active'
    const isAuthorSuspended = authorStatus === 'suspended' || authorStatus === 'banned'
    
    return !hasObjectionableContent && !isFrequentlyReported && !isAuthorSuspended
  })
}

// Update the getRecommendedFeedItems function to include filtering
async function getRecommendedFeedItems(
  allItems: any[], 
  userPrefs: UserFeedPreferences, 
  limit: number = 20
): Promise<any[]> {
  // First, filter out objectionable content
  const filteredItems = filterObjectionableContent(allItems)
  
  // Then apply the existing recommendation logic
  const scoredItems: FeedItemScore[] = filteredItems.map(item => {
    const userInterestMatch = calculateUserInterestMatch(item, userPrefs)
    const locationRelevance = calculateLocationRelevance(item, userPrefs)
    const timeRelevance = getTimeRelevanceScore(item)
    const popularityScore = calculatePopularityScore(item)
    const userBehaviorScore = calculateUserBehaviorScore(item, userPrefs)
    const diversityScore = calculateDiversityScore(item, []) // Will be updated in loop
    
    const totalScore = (
      userInterestMatch * 0.3 +
      locationRelevance * 0.2 +
      timeRelevance * 0.15 +
      popularityScore * 0.2 +
      userBehaviorScore * 0.1 +
      diversityScore * 0.05
    )
    
    return {
      item,
      score: totalScore,
      factors: {
        userInterestMatch,
        locationRelevance,
        timeRelevance,
        popularityScore,
        userBehaviorScore,
        diversityScore
      }
    }
  })
  
  // Sort by score and apply diversity
  const recommendedItems: any[] = []
  const selectedCategories = new Set<string>()
  
  for (const scoredItem of scoredItems.sort((a, b) => b.score - a.score)) {
    // Update diversity score based on already selected items
    scoredItem.factors.diversityScore = calculateDiversityScore(scoredItem.item, recommendedItems)
    
    // Recalculate total score with updated diversity
    const finalScore = (
      scoredItem.factors.userInterestMatch * 0.3 +
      scoredItem.factors.locationRelevance * 0.2 +
      scoredItem.factors.timeRelevance * 0.15 +
      scoredItem.factors.popularityScore * 0.2 +
      scoredItem.factors.userBehaviorScore * 0.1 +
      scoredItem.factors.diversityScore * 0.05
    )
    
    // Check if we should include this item based on diversity
    const itemCategory = scoredItem.item.category || 'general'
    const categoryCount = selectedCategories.has(itemCategory) ? 1 : 0
    
    // Limit similar content to maintain diversity
    if (categoryCount < 3 || recommendedItems.length < limit * 0.3) {
      recommendedItems.push(scoredItem.item)
      selectedCategories.add(itemCategory)
    }
    
    if (recommendedItems.length >= limit) break
  }
  
  return recommendedItems
}

// Get user feed preferences and interaction history
async function getUserFeedPreferences(userId: string): Promise<UserFeedPreferences> {
  const payload = await getPayload({ config })
  
  try {
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 2
    })
    
    // Get user's saved locations
    const savedLocationsResult = await payload.find({
      collection: 'savedLocations',
      where: {
        user: { equals: userId }
      },
      limit: 100
    })
    
    // Get user's liked posts
    const likedPostsResult = await payload.find({
      collection: 'posts',
      where: {
        'likedBy': { contains: userId }
      },
      limit: 100
    })
    
    // Get user's followed users
    const followedUsersResult = await payload.find({
      collection: 'users',
      where: {
        'followers': { contains: userId }
      },
      limit: 100
    })
    
    // Get user's interaction history (this would need to be implemented)
    const interactionHistory: Array<{
      itemId: string
      type: 'post' | 'location' | 'event'
      action: 'like' | 'save' | 'share' | 'comment'
      timestamp: Date
    }> = []
    
    // For now, we'll use saved locations and liked posts as a proxy for interaction history
    savedLocationsResult.docs.forEach(saved => {
      interactionHistory.push({
        itemId: saved.location?.id || '',
        type: 'location',
        action: 'save',
        timestamp: new Date(saved.createdAt)
      })
    })
    
    likedPostsResult.docs.forEach(post => {
      interactionHistory.push({
        itemId: String(post.id),
        type: 'post',
        action: 'like',
        timestamp: new Date(post.createdAt)
      })
    })
    
    return {
      categories: user.preferences?.categories || [],
      savedLocations: savedLocationsResult.docs.map(saved => String(saved.location?.id || '')),
      likedPosts: likedPostsResult.docs.map(post => String(post.id)),
      followedUsers: followedUsersResult.docs.map(followed => String(followed.id)),
      location: user.location,
      interactionHistory
    }
  } catch (error) {
    console.error('Error fetching user feed preferences:', error)
    return {
      categories: [],
      savedLocations: [],
      likedPosts: [],
      followedUsers: [],
      interactionHistory: []
    }
  }
}

// Enhanced function to update user interaction states with recommendations
async function updateUserInteractionStates(
  items: any[],
  userId: string,
  payload: any
): Promise<void> {
  if (!userId) return

  try {
    // Get user's saved posts
    const savedPostsResult = await payload.find({
      collection: 'savedPosts',
      where: {
        user: { equals: userId }
      },
      limit: 1000
    })

    // Get user's liked posts
    const likedPostsResult = await payload.find({
      collection: 'posts',
      where: {
        'likedBy': { contains: userId }
      },
      limit: 1000
    })

    // Create sets for faster lookup
    const savedPostIds = new Set(savedPostsResult.docs.map((sp: any) => sp.post?.id))
    const likedPostIds = new Set(likedPostsResult.docs.map((p: any) => p.id))

    // Update each item with user interaction state
    items.forEach((item: any) => {
      if (item.id) {
        item.isLiked = likedPostIds.has(item.id)
        item.isSaved = savedPostIds.has(item.id)
      }
    })
  } catch (error) {
    console.error('Error updating user interaction states:', error)
  }
}

// Calculate content mix for diversity
function calculateContentMix(items: any[]): Record<string, number> {
  const mix: Record<string, number> = {
    posts: 0,
    locations: 0,
    events: 0,
    recommendations: 0
  }

  items.forEach(item => {
    if (item.type === 'location') mix.locations!++
    else if (item.type === 'event') mix.events!++
    else if (item.isRecommendation) mix.recommendations!++
    else mix.posts!++
  })

  return mix
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const type = searchParams.get('type') || 'recommended' // recommended, latest, popular, following

    // Get current user
    const user = await getServerSideUser()
    const currentUserId = user?.id

    console.log(`Enhanced Feed API: Getting ${type} feed for user ${currentUserId}`)

    const payload = await getPayload({ config })
    let feedItems: any[] = []

    switch (type) {
      case 'recommended':
        if (currentUserId) {
          // Get all posts, locations, and events
          const [postsResult, locationsResult, eventsResult] = await Promise.all([
            payload.find({
              collection: 'posts',
              where: {
                status: { equals: 'published' }
              },
              limit: 100,
              page: 1,
              depth: 2,
              sort: '-createdAt'
            }),
            payload.find({
              collection: 'locations',
              where: {
                status: { equals: 'published' }
              },
              limit: 50,
              page: 1,
              depth: 2,
              sort: '-createdAt'
            }),
            payload.find({
              collection: 'events',
              where: {
                status: { equals: 'published' }
              },
              limit: 30,
              page: 1,
              depth: 2,
              sort: '-startDate'
            })
          ])

          // Combine and format items
          const allItems = [
            ...postsResult.docs.map((post: any) => ({
              ...post,
              type: 'post',
              isRecommendation: false
            })),
            ...locationsResult.docs.map((location: any) => ({
              ...location,
              type: 'location',
              isRecommendation: false
            })),
            ...eventsResult.docs.map((event: any) => ({
              ...event,
              type: 'event',
              isRecommendation: false
            }))
          ]

          // Get user preferences and apply recommendations
          const userPrefs = await getUserFeedPreferences(currentUserId)
          feedItems = await getRecommendedFeedItems(allItems, userPrefs, limit)

          console.log(`Generated ${feedItems.length} recommended feed items for user ${currentUserId}`)
        } else {
          // Fallback to latest posts for non-authenticated users
          const postsResult = await payload.find({
            collection: 'posts',
            where: {
              status: { equals: 'published' }
            },
            limit,
            page,
            depth: 2,
            sort: '-createdAt'
          })
          feedItems = postsResult.docs
        }
        break

      case 'latest':
        const latestResult = await payload.find({
          collection: 'posts',
          where: {
            status: { equals: 'published' }
          },
          limit,
          page,
          depth: 2,
          sort: '-createdAt'
        })
        feedItems = latestResult.docs
        break

      case 'popular':
        const popularResult = await payload.find({
          collection: 'posts',
          where: {
            status: { equals: 'published' }
          },
          limit,
          page,
          depth: 2,
          sort: '-likeCount'
        })
        feedItems = popularResult.docs
        break

      case 'following':
        if (currentUserId) {
          // Get posts from followed users
          const followingResult = await payload.find({
            collection: 'posts',
            where: {
              and: [
                { status: { equals: 'published' } },
                { createdBy: { in: user.following || [] } }
              ]
            },
            limit,
            page,
            depth: 2,
            sort: '-createdAt'
          })
          feedItems = followingResult.docs
        }
        break

      default:
        const defaultResult = await payload.find({
          collection: 'posts',
          where: {
            status: { equals: 'published' }
          },
          limit,
          page,
          depth: 2,
          sort: '-createdAt'
        })
        feedItems = defaultResult.docs
    }

    // Update user interaction states
    await updateUserInteractionStates(feedItems, currentUserId, payload)

    // Calculate content mix
    const contentMix = calculateContentMix(feedItems)

    return NextResponse.json({
      success: true,
      data: {
        items: feedItems,
        pagination: {
          page,
          limit,
          hasMore: feedItems.length === limit
        },
        meta: {
          type,
          contentMix,
          recommendationFactors: type === 'recommended' ? {
            userPreferences: currentUserId ? 'applied' : 'not_available',
            timeRelevance: 'applied',
            diversity: 'applied',
            popularity: 'applied',
            userBehavior: 'applied'
          } : undefined
        }
      }
    })
  } catch (error) {
    console.error('Enhanced Feed API: Error fetching feed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch feed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 })
} 