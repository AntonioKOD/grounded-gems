import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getBlockedUserIds, getUsersWhoBlockedMe } from '@/lib/blocked-users-helper'

// GET /api/mobile/people-suggestions - Get organized people suggestions like Instagram/Facebook
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Get current user for personalization
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }
    
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const category = searchParams.get('category') // 'nearby', 'mutual', 'suggested', 'all'
    const randomPlacement = searchParams.get('randomPlacement') === 'true' // For random placement in All tab
    const sessionId = searchParams.get('sessionId') // For tracking user frequency
    
    // Get current user's location and following list
    const currentUserLocation = user.location?.coordinates
    
    // Extract user IDs from following array (handle both string IDs and full user objects)
    const currentUserFollowing = (user.following || []).map((item: any) => 
      typeof item === 'string' ? item : item.id || item._id
    ).filter(Boolean)
    
    const currentUserFollowers = user.followers || []
    
    // Get blocked users for filtering
    const blockedUserIds = await getBlockedUserIds(String(user.id))
    const usersWhoBlockedMe = await getUsersWhoBlockedMe(String(user.id))
    const usersToExclude = [...blockedUserIds, ...usersWhoBlockedMe]
    
    console.log(`📱 People suggestions: User ${user.id}, category: ${category}, following ${currentUserFollowing.length} users:`, currentUserFollowing)
    console.log(`📱 People suggestions: Blocked ${blockedUserIds.length} users, blocked by ${usersWhoBlockedMe.length} users`)
    
    // Build base query to exclude current user and users already being followed
    const baseWhereConditions: any[] = [
      { id: { not_equals: user.id } } // Always exclude current user
    ]
    
    // Add condition to exclude users that the current user already follows
    if (currentUserFollowing && currentUserFollowing.length > 0) {
      console.log(`🔍 Filtering out ${currentUserFollowing.length} already followed users:`, currentUserFollowing)
      baseWhereConditions.push({
        id: { not_in: currentUserFollowing }
      })
    } else {
      console.log(`🔍 No users to filter out (following list is empty)`)
    }
    
    // Add condition to exclude blocked users
    if (usersToExclude.length > 0) {
      console.log(`🔍 Filtering out ${usersToExclude.length} blocked users:`, usersToExclude)
      baseWhereConditions.push({
        id: { not_in: usersToExclude }
      })
    }
    
    // Get users with enhanced data
    const usersResult = await payload.find({
      collection: 'users',
      where: {
        and: baseWhereConditions
      },
      sort: '-createdAt',
      page,
      limit: limit * 3, // Get more to filter and organize
      depth: 2,
    })
    
    // Process and categorize users (filtering out already followed users)
    const processedUsers = usersResult.docs
      .filter((userData: any) => !currentUserFollowing.includes(userData.id)) // Double-check filtering
      .map((userData: any) => {
      // Calculate mutual followers
      const userFollowing = (userData.following || []).map((item: any) => 
        typeof item === 'string' ? item : item.id || item._id
      ).filter(Boolean)
      const userFollowers = (userData.followers || []).map((item: any) => 
        typeof item === 'string' ? item : item.id || item._id
      ).filter(Boolean)
      const mutualFollowers = currentUserFollowing.filter((id: string) => 
        userFollowers.includes(id)
      )
      
      // Calculate distance if both users have location
      let distance: number | null = null
      if (currentUserLocation && userData.location?.coordinates) {
        const userLat = userData.location.coordinates.latitude
        const userLng = userData.location.coordinates.longitude
        if (userLat && userLng) {
          distance = calculateDistance(
            currentUserLocation.latitude,
            currentUserLocation.longitude,
            userLat,
            userLng
          )
        }
      }
      
      // Calculate suggestion score based on various factors
      let suggestionScore = 0
      
      // Mutual followers boost (highest priority)
      suggestionScore += mutualFollowers.length * 15
      
      // Nearby users boost (within 25 miles)
      if (distance && distance <= 25) {
        suggestionScore += Math.max(0, 25 - distance) * 3
      }
      
      // Active users boost (recent activity)
      if (userData.lastLogin) {
        const daysSinceLastLogin = (Date.now() - new Date(userData.lastLogin).getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceLastLogin <= 7) suggestionScore += 8
        else if (daysSinceLastLogin <= 30) suggestionScore += 4
      }
      
      // Profile completeness boost
      if (userData.profileImage) suggestionScore += 5
      if (userData.bio) suggestionScore += 3
      if (userData.username) suggestionScore += 2
      
      // Creator status boost
      if (userData.isCreator) suggestionScore += 5
      
      // Verified status boost
      if (userData.isVerified) suggestionScore += 3
      
      return {
        id: userData.id,
        name: userData.name,
        username: userData.username || null,
        bio: userData.bio || '',
        profileImage: userData.profileImage ? (typeof userData.profileImage === 'object' ? userData.profileImage.url : userData.profileImage) : null,
        location: userData.location?.coordinates ? {
          latitude: userData.location.coordinates.latitude || 0,
          longitude: userData.location.coordinates.longitude || 0
        } : null,
        distance: distance,
        mutualFollowers: mutualFollowers.length,
        mutualFollowersList: mutualFollowers.slice(0, 3), // Show first 3 mutual followers
        followersCount: userFollowers.length,
        followingCount: userFollowing.length,
        isFollowing: currentUserFollowing.includes(userData.id),
        isFollowedBy: currentUserFollowers.includes(userData.id),
        isCreator: userData.isCreator || false,
        isVerified: userData.isVerified || false,
        suggestionScore,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        lastLogin: userData.lastLogin
      }
    })
    
    // Sort by suggestion score, but add randomization for "all" category
    let sortedUsers = processedUsers.sort((a, b) => b.suggestionScore - a.suggestionScore)
    
    // For "all" category, add some randomization to make suggestions more dynamic
    if (category === 'all') {
      // Create a deterministic but varied seed based on user ID and time
      const timeSeed = Math.floor(Date.now() / (1000 * 60 * 60)) // Changes every hour
      const userSeed = parseInt(String(user.id).slice(-4), 16) || 0
      const combinedSeed = timeSeed + userSeed
      
      // Take top 60% by score, then randomize with some variety
      const topUsers = sortedUsers.slice(0, Math.ceil(sortedUsers.length * 0.6))
      const remainingUsers = sortedUsers.slice(Math.ceil(sortedUsers.length * 0.6))
      
      // Shuffle with seed-based randomization for consistency within the hour
      const shuffledTopUsers = topUsers.sort((a, b) => {
        const aHash = (a.id + combinedSeed).split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
        const bHash = (b.id + combinedSeed).split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
        return (aHash % 100) - (bHash % 100)
      })
      
      // Combine shuffled top users with remaining users
      sortedUsers = [...shuffledTopUsers, ...remainingUsers]
      
      console.log(`🎲 All tab randomization: Top ${topUsers.length} users shuffled with seed ${combinedSeed} for variety`)
    }
    
    console.log(`📱 People suggestions filtered: ${usersResult.docs.length} total users, ${processedUsers.length} after filtering out followed users`)
    
    // Organize into Instagram/Facebook-like categories
    const nearbyUsers = sortedUsers.filter(user => user.distance && user.distance <= 25)
    const mutualConnectionUsers = sortedUsers.filter(user => user.mutualFollowers > 0 && (!user.distance || user.distance > 25))
    let otherUsers = sortedUsers.filter(user => user.mutualFollowers === 0 && (!user.distance || user.distance > 25))
    
    // If no users in "suggested" category, add some users from other categories to ensure variety
    if (otherUsers.length === 0 && sortedUsers.length > 0) {
      // Take some users from the remaining pool (users not in nearby or mutual)
      const allCategorizedUsers = [...nearbyUsers, ...mutualConnectionUsers]
      const remainingUsers = sortedUsers.filter(user => !allCategorizedUsers.includes(user))
      otherUsers = remainingUsers.slice(0, Math.min(5, remainingUsers.length))
      console.log(`📱 No users in suggested category, added ${otherUsers.length} users from remaining pool`)
    }
    
    // Debug: Log categorization results
    console.log(`📱 User categorization:`, {
      totalUsers: sortedUsers.length,
      nearbyUsers: nearbyUsers.length,
      mutualUsers: mutualConnectionUsers.length,
      otherUsers: otherUsers.length
    })
    
    // Create categorized suggestions
    const suggestions: any[] = []
    
    // Define limits based on category
    const isAllCategory = category === 'all'
    const nearbyLimit = isAllCategory ? 3 : 20  // Higher limits for individual tabs
    const mutualLimit = isAllCategory ? 3 : 20  // Higher limits for individual tabs
    const suggestedLimit = isAllCategory ? 2 : 15  // Higher limits for individual tabs
    
    // Create category data
    const categoryData = [
      {
        category: 'nearby',
        title: 'People Near You',
        subtitle: `${nearbyUsers.length} people nearby`,
        icon: 'location.fill',
        users: nearbyUsers,
        limit: category === 'nearby' ? 15 : nearbyLimit
      },
      {
        category: 'mutual',
        title: 'People You May Know',
        subtitle: `${mutualConnectionUsers.length} people with mutual connections`,
        icon: 'person.2.fill',
        users: mutualConnectionUsers,
        limit: category === 'mutual' ? 15 : mutualLimit
      },
      {
        category: 'suggested',
        title: 'Suggested for You',
        subtitle: 'Based on your activity and interests',
        icon: 'sparkles',
        users: otherUsers,
        limit: category === 'suggested' ? 12 : suggestedLimit
      }
    ].filter(cat => cat.users.length > 0)
    
    // Debug: Log category data before filtering
    console.log(`📱 Category data before filtering:`, categoryData.map(cat => ({
      category: cat.category,
      userCount: cat.users.length,
      title: cat.title
    })))
    
    // For "all" category, randomize the order of categories
    if (category === 'all') {
      const timeSeed = Math.floor(Date.now() / (1000 * 60 * 60)) // Changes every hour
      const userSeed = parseInt(String(user.id).slice(-4), 16) || 0
      const combinedSeed = timeSeed + userSeed
      
      // Shuffle categories based on seed
      categoryData.sort((a, b) => {
        const aHash = (a.category + combinedSeed).split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
        const bHash = (b.category + combinedSeed).split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
        return (aHash % 100) - (bHash % 100)
      })
      
      console.log(`🎲 All tab category order randomized with seed ${combinedSeed}`)
    }
    
    // Add categories to suggestions
    categoryData.forEach(cat => {
      if (category === cat.category || category === 'all') {
        let selectedUsers = cat.users.slice(0, cat.limit)
        
        // For "all" category, add some variety by occasionally starting from a different offset
        if (category === 'all' && cat.users.length > cat.limit) {
          const timeSeed = Math.floor(Date.now() / (1000 * 60 * 60)) // Changes every hour
          const userSeed = parseInt(String(user.id).slice(-4), 16) || 0
          const combinedSeed = timeSeed + userSeed
          
          // 30% chance to start from a different offset for variety
          const shouldOffset = (combinedSeed % 10) < 3
          if (shouldOffset) {
            const maxOffset = Math.max(0, cat.users.length - cat.limit)
            const offset = (combinedSeed % maxOffset) || 0
            selectedUsers = cat.users.slice(offset, offset + cat.limit)
            console.log(`🎲 All tab: ${cat.category} category using offset ${offset} for variety`)
          }
        }
        
        // For random placement in All tab, add position metadata
        let position = 'middle' // Default position
        if (category === 'all' && randomPlacement) {
          const positions = ['top', 'middle', 'bottom', 'middle', 'bottom'] // More variety
          const timeSeed = Math.floor(Date.now() / (1000 * 60 * 60))
          const userSeed = parseInt(String(user.id).slice(-4), 16) || 0
          const combinedSeed = timeSeed + userSeed
          const positionIndex = (combinedSeed + cat.category.length + cat.users.length) % positions.length
          position = positions[positionIndex] || 'middle'
        }
        
        suggestions.push({
          category: cat.category,
          title: cat.title,
          subtitle: cat.subtitle,
          icon: cat.icon,
          users: selectedUsers,
          position: position, // For random placement
          maxFrequency: 2 // Max times a user can be shown per session
        })
      }
    })
    
    // If specific category requested, filter to that category only
    let finalSuggestions = suggestions
    if (category && category !== 'all') {
      finalSuggestions = suggestions.filter(s => s.category === category)
    }
    
    // Log what categories are being returned
    console.log(`📱 Final suggestions for category '${category}':`, finalSuggestions.map(s => s.category))
    
    console.log(`📱 People suggestions organized: ${nearbyUsers.length} nearby, ${mutualConnectionUsers.length} mutual, ${otherUsers.length} other (excluding ${currentUserFollowing.length} already followed users)`)
    console.log(`📱 Limits applied - Category: ${category}, All tab: ${isAllCategory}, Nearby: ${nearbyLimit}, Mutual: ${mutualLimit}, Suggested: ${suggestedLimit}`)
    
    return NextResponse.json({
      success: true,
      data: {
        suggestions: finalSuggestions,
        pagination: {
          page,
          limit,
          total: processedUsers.length,
          hasMore: processedUsers.length >= limit * 3
        },
        meta: {
          category,
          userLocation: currentUserLocation,
          totalNearby: nearbyUsers.length,
          totalMutual: mutualConnectionUsers.length,
          totalSuggested: otherUsers.length,
          filtering: {
            excludedAlreadyFollowed: currentUserFollowing.length,
            totalUsersBeforeFilter: usersResult.docs.length,
            totalUsersAfterFilter: processedUsers.length
          }
        }
      }
    })
    
  } catch (error) {
    console.error('Error fetching people suggestions:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch people suggestions' 
    }, { status: 500 })
  }
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
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

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 