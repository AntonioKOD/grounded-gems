import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getBlockedUserIds, getUsersWhoBlockedMe } from '@/lib/blocked-users-helper'

// POST /api/mobile/search - AI-powered search with natural language understanding
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()
    const { query, type = 'all', coordinates } = body
    
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Query is required and must be at least 2 characters.' }, { status: 400 })
    }
    
    // Get current user for personalization
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
      }
    } catch (authError) {
      console.log('No authenticated user for search request')
    }
    
    // AI-powered query analysis
    const queryAnalysis = await analyzeQuery(query, coordinates)
    console.log('🤖 AI Query Analysis:', queryAnalysis)
    
    // Enhanced search based on AI analysis
    let searchResults: any = {
      guides: [],
      locations: [],
      users: [],
      suggestedQueries: []
    }
    
    // Search locations with AI-enhanced filtering
    if (queryAnalysis.shouldSearchLocations) {
      const locationQuery = queryAnalysis.locationSearchTerms.length > 0 
        ? queryAnalysis.locationSearchTerms.join(' ') 
        : query
      
      console.log('🔍 Searching locations with query:', locationQuery)
      console.log('🔍 Categories to search:', queryAnalysis.categories)
      
      try {
      
      // Build flexible search conditions
      const searchConditions = []
      
      // Always filter by published status first
      searchConditions.push({ status: { equals: 'published' } })
      
      // Search by name and description using Payload's like operator
      if (locationQuery && locationQuery.trim()) {
        searchConditions.push({
          or: [
            { name: { like: locationQuery } },
            { description: { like: locationQuery } }
          ]
        })
      }
      
      // Search by categories if available
      if (queryAnalysis.categories.length > 0) {
        searchConditions.push({
          categories: { in: queryAnalysis.categories }
        })
      }
      
      console.log('🔍 Search conditions:', JSON.stringify(searchConditions, null, 2))
      
      let locationsResult: any
      
      try {
        // Build proper search query based on the search terms
        let searchQuery = {}
        
        if (locationQuery && locationQuery.trim()) {
          // Simplified search - just search by name and description
          searchQuery = {
            and: [
              { status: { equals: 'published' } },
              {
                or: [
                  { name: { like: locationQuery } },
                  { description: { like: locationQuery } }
                ]
              }
            ]
          }
        } else {
          // If no specific query, just get published locations
          searchQuery = { status: { equals: 'published' } }
        }
        
        console.log('🔍 Final search query:', JSON.stringify(searchQuery, null, 2))
        
        locationsResult = await payload.find({
          collection: 'locations',
          where: searchQuery,
          limit: 50,
          sort: '-createdAt',
          depth: 1
        })
        
        console.log(`🔍 Database query successful, found ${locationsResult.docs.length} locations`)
        
      } catch (dbError) {
        console.error('❌ Database query error:', dbError)
        console.error('❌ Error details:', dbError instanceof Error ? dbError.message : String(dbError))
        locationsResult = { docs: [] }
      }
      
      console.log(`🔍 Found ${locationsResult.docs.length} raw locations from database`)
      
      // Use the database results directly - the query already filtered them
      let filteredLocations = locationsResult.docs
      console.log(`🔍 Using ${filteredLocations.length} locations from database query`)
      
      // Filter and enhance locations based on AI analysis
      const enhancedLocations = filteredLocations
        .map((l: any) => {
          const relevanceScore = calculateLocationRelevance(l, queryAnalysis)
          console.log(`🔍 Location "${l.name}" - Score: ${relevanceScore}`)
          
          return {
            id: l.id,
            name: l.name,
            address: typeof l.address === 'string' ? l.address : formatAddress(l.address),
            featuredImage: l.featuredImage?.url || null,
            description: l.description,
            categories: l.categories,
            averageRating: l.averageRating,
            reviewCount: l.reviewCount,
            isVerified: l.isVerified,
            priceRange: l.priceRange,
            businessHours: l.businessHours,
            insiderTips: l.insiderTips,
            createdAt: l.createdAt,
            relevanceScore: relevanceScore
          }
        })
        .filter((loc: any) => loc.relevanceScore > 0)
        .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
        .slice(0, 10)
      
      console.log(`🔍 Final enhanced locations: ${enhancedLocations.length}`)
      searchResults.locations = enhancedLocations
      
      } catch (searchError) {
        console.error('❌ Location search error:', searchError)
        searchResults.locations = []
        // Store error in a separate variable instead of adding to searchResults
        const searchErrorMessage = searchError instanceof Error ? searchError.message : String(searchError)
        console.error('❌ Search error details:', searchErrorMessage)
      }
    }
    
    // Search guides with AI context
    if (queryAnalysis.shouldSearchGuides) {
    const guidesResult = await payload.find({
      collection: 'guides',
        where: { 
          or: [
            { title: { like: query } },
            { description: { like: query } }
          ]
        },
      limit: 10,
      sort: '-createdAt',
      depth: 1
    })
      
      searchResults.guides = guidesResult.docs.map((g: any) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      featuredImage: g.featuredImage?.url || null,
      createdAt: g.createdAt
    }))
    }
    
    // Enhanced people search with AI context
    if (queryAnalysis.shouldSearchUsers) {
      try {
        const currentUserLocation = currentUser?.location?.coordinates
        const currentUserFollowing = currentUser?.following || []
        const currentUserFollowers = currentUser?.followers || []
        
        console.log('🔍 Searching users with query:', query)
        
        // Get blocked users for filtering
        let blockedUserIds: string[] = []
        let usersWhoBlockedMe: string[] = []
        
        if (currentUser) {
          blockedUserIds = await getBlockedUserIds(String(currentUser.id))
          usersWhoBlockedMe = await getUsersWhoBlockedMe(String(currentUser.id))
          console.log('🔍 Blocked users:', blockedUserIds.length)
          console.log('🔍 Users who blocked me:', usersWhoBlockedMe.length)
        }
        
        // Build user search query
        let userSearchQuery = {}
        
        if (query && query.trim()) {
          const userSearchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2)
          console.log('🔍 User search terms:', userSearchTerms)
          
          const userOrConditions = userSearchTerms.map(term => ({
            or: [
              { name: { like: term } },
              { username: { like: term } },
              { bio: { like: term } }
            ]
          }))
          
          userSearchQuery = {
            and: [
              ...userOrConditions
            ]
          }
        } else {
          // If no query, get recent users
          userSearchQuery = {}
        }
        
        // Add blocked users filtering
        const usersToExclude = [...blockedUserIds, ...usersWhoBlockedMe]
        if (usersToExclude.length > 0) {
          userSearchQuery = {
            and: [
              userSearchQuery,
              { id: { not_in: usersToExclude } }
            ]
          }
        }
        
        console.log('🔍 User search query:', JSON.stringify(userSearchQuery, null, 2))
        
        const usersResult = await payload.find({
          collection: 'users',
          where: userSearchQuery,
          limit: 20,
          sort: '-createdAt',
          depth: 2
        })
        
        const processedUsers = usersResult.docs.map((u: any) => {
          // Calculate distance if coordinates available
          let distance = null
          if (currentUserLocation && u.location?.coordinates) {
              distance = calculateDistance(
                currentUserLocation.latitude,
                currentUserLocation.longitude,
              u.location.coordinates.latitude,
              u.location.coordinates.longitude
            )
          }
          
          // Calculate mutual followers
          const userFollowers = u.followers || []
          const userFollowing = u.following || []
          const mutualFollowers = userFollowers.filter((followerId: string) => 
            currentUserFollowers.includes(followerId)
          )
          
          // Calculate relevance score
          let relevanceScore = 0
          
          // Exact matches get highest score
          if (u.name?.toLowerCase() === query.toLowerCase()) relevanceScore += 100
          if (u.username?.toLowerCase() === query.toLowerCase()) relevanceScore += 100
          
          // Starts with query
          if (u.name?.toLowerCase().startsWith(query.toLowerCase())) relevanceScore += 50
          if (u.username?.toLowerCase().startsWith(query.toLowerCase())) relevanceScore += 50
          
          // Contains query
          if (u.name?.toLowerCase().includes(query.toLowerCase())) relevanceScore += 25
          if (u.username?.toLowerCase().includes(query.toLowerCase())) relevanceScore += 25
          
          // Mutual followers boost
          relevanceScore += mutualFollowers.length * 10
          
          // Nearby users boost (within 25 miles)
          if (distance && distance <= 25) {
            relevanceScore += Math.round(Math.max(0, 25 - distance) * 2)
          }
          
          // Profile completeness boost
          if (u.profileImage) relevanceScore += 3
          if (u.bio) relevanceScore += 2
          
          return {
            id: u.id,
            name: u.name,
            username: u.username || null,
            email: u.email,
            profileImage: u.profileImage?.url || null,
            bio: u.bio || '',
            location: u.location?.coordinates?.latitude && u.location?.coordinates?.longitude ? {
              latitude: Math.round(u.location.coordinates.latitude * 1000000) / 1000000,
              longitude: Math.round(u.location.coordinates.longitude * 1000000) / 1000000
            } : {
              latitude: 0.0,
              longitude: 0.0
            },
            distance: distance || 0.0,
            mutualFollowers: mutualFollowers.length || 0,
            mutualFollowersList: mutualFollowers.slice(0, 3),
            followersCount: userFollowers.length || 0,
            followingCount: userFollowing.length || 0,
            isFollowing: currentUserFollowing.includes(u.id) || false,
            isFollowedBy: currentUserFollowers.includes(u.id) || false,
            relevanceScore: Math.round(relevanceScore) || 0,
            createdAt: u.createdAt
          }
        })
        
        searchResults.users = processedUsers
          .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
          .slice(0, 10)
        
      } catch (error) {
        console.error('Error in enhanced user search:', error)
      }
    }
    
    // Generate suggested queries only (no AI insights for now)
    searchResults.suggestedQueries = await generateSuggestedQueries(query, searchResults, queryAnalysis)
    
    // Debug logging
    console.log('🔍 Search Results Summary:', {
      query,
      locationsFound: searchResults.locations.length,
      guidesFound: searchResults.guides.length,
      usersFound: searchResults.users.length,
      suggestedQueries: searchResults.suggestedQueries?.length
    })
    
    // Ensure all required fields are present
    const responseData = {
      guides: searchResults.guides || [],
      locations: searchResults.locations || [],
      users: searchResults.users || [],
      suggestedQueries: searchResults.suggestedQueries || [],
      aiInsights: {
        summary: `Found ${(searchResults.locations?.length || 0) + (searchResults.guides?.length || 0) + (searchResults.users?.length || 0)} results for "${query}"`,
        recommendations: [],
        context: queryAnalysis.context,
        totalResults: (searchResults.locations?.length || 0) + (searchResults.guides?.length || 0) + (searchResults.users?.length || 0)
      }
    }
    
    console.log('🔍 Final response data:', {
      locationsCount: responseData.locations.length,
      guidesCount: responseData.guides.length,
      usersCount: responseData.users.length,
      suggestedQueriesCount: responseData.suggestedQueries.length
    })
    
    return NextResponse.json({
      success: true,
      data: responseData
    })
  } catch (error) {
    console.error('Search error:', error)
    
    // Return a proper error response with fallback data
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to perform search',
      data: {
        guides: [],
        locations: [],
        users: [],
        suggestedQueries: ['Restaurants near me', 'Things to do today', 'Popular places'],
        aiInsights: {
          summary: 'Search temporarily unavailable. Please try again.',
          recommendations: ['Check your internet connection', 'Try a different search term'],
          context: 'error',
          totalResults: 0
        }
      }
    }, { status: 500 })
  }
}

// AI-powered query analysis
async function analyzeQuery(query: string, coordinates?: any) {
  try {
    const analysis = {
      intent: 'general',
      shouldSearchLocations: true,
      shouldSearchGuides: true,
      shouldSearchUsers: true,
      locationSearchTerms: [] as string[],
      categories: [] as string[],
      context: 'general',
      isFamilyQuery: false,
      isDateQuery: false,
      isGroupQuery: false,
      isSoloQuery: false,
      pricePreference: null as string | null,
      activityType: null as string | null
    }
    
    const lowerQuery = query.toLowerCase()
    
    // Enhanced conversational understanding
    // Detect location-specific queries (like "a quincy restaurant")
    const locationPatterns = [
      /(?:a|an|the)\s+([a-zA-Z\s]+)\s+(restaurant|cafe|bar|park|museum|store|shop)/i,
      /(?:restaurant|cafe|bar|park|museum|store|shop)\s+(?:in|at|near)\s+([a-zA-Z\s]+)/i,
      /([a-zA-Z\s]+)\s+(?:restaurant|cafe|bar|park|museum|store|shop)/i
    ]
    
    for (const pattern of locationPatterns) {
      const match = lowerQuery.match(pattern)
      if (match) {
        const locationName = match[1]?.trim()
        const placeType = match[2] || match[3] || 'place'
        if (locationName && locationName.length > 2) {
          analysis.locationSearchTerms.push(locationName, placeType)
          analysis.categories.push(placeType)
          console.log(`🔍 Detected location query: ${locationName} ${placeType}`)
        }
      }
    }
    
    // Detect family-related queries
    if (lowerQuery.includes('kids') || lowerQuery.includes('children') || lowerQuery.includes('family')) {
      analysis.isFamilyQuery = true
      analysis.context = 'family'
      analysis.categories = ['family-friendly', 'parks', 'museums', 'playgrounds', 'restaurants']
    }
    
    // Detect date-related queries
    if (lowerQuery.includes('date') || lowerQuery.includes('romantic') || lowerQuery.includes('couple')) {
      analysis.isDateQuery = true
      analysis.context = 'date'
      analysis.categories = ['restaurants', 'cafes', 'bars', 'entertainment']
    }
    
    // Detect group-related queries
    if (lowerQuery.includes('group') || lowerQuery.includes('friends') || lowerQuery.includes('party')) {
      analysis.isGroupQuery = true
      analysis.context = 'group'
      analysis.categories = ['bars', 'restaurants', 'entertainment', 'activities']
    }
    
    // Detect solo-related queries
    if (lowerQuery.includes('solo') || lowerQuery.includes('alone') || lowerQuery.includes('quiet')) {
      analysis.isSoloQuery = true
      analysis.context = 'solo'
      analysis.categories = ['cafes', 'libraries', 'parks', 'museums']
    }
    
    // Detect price preferences
    if (lowerQuery.includes('cheap') || lowerQuery.includes('budget') || lowerQuery.includes('free')) {
      analysis.pricePreference = 'budget'
    } else if (lowerQuery.includes('expensive') || lowerQuery.includes('luxury') || lowerQuery.includes('fine dining')) {
      analysis.pricePreference = 'expensive'
    }
    
    // Detect activity types
    if (lowerQuery.includes('eat') || lowerQuery.includes('food') || lowerQuery.includes('dinner') || lowerQuery.includes('lunch')) {
      analysis.activityType = 'dining'
      analysis.locationSearchTerms.push('restaurant', 'cafe', 'food')
    }
    
    if (lowerQuery.includes('drink') || lowerQuery.includes('bar') || lowerQuery.includes('alcohol')) {
      analysis.activityType = 'drinks'
      analysis.locationSearchTerms.push('bar', 'pub', 'brewery')
    }
    
    if (lowerQuery.includes('outdoor') || lowerQuery.includes('park') || lowerQuery.includes('nature')) {
      analysis.activityType = 'outdoor'
      analysis.locationSearchTerms.push('park', 'outdoor', 'nature')
    }
    
    if (lowerQuery.includes('culture') || lowerQuery.includes('museum') || lowerQuery.includes('art')) {
      analysis.activityType = 'culture'
      analysis.locationSearchTerms.push('museum', 'gallery', 'theater')
    }
    
    // Extract location-specific terms
    const locationKeywords = ['place', 'location', 'spot', 'venue', 'area', 'nearby', 'around']
    locationKeywords.forEach(keyword => {
      if (lowerQuery.includes(keyword)) {
        analysis.locationSearchTerms.push(keyword)
      }
    })
    
    // If no specific location terms found, use the entire query for location search
    if (analysis.locationSearchTerms.length === 0) {
      analysis.locationSearchTerms.push(query.trim())
    }
    
    console.log('🤖 Enhanced Query Analysis:', {
      originalQuery: query,
      locationSearchTerms: analysis.locationSearchTerms,
      categories: analysis.categories,
      context: analysis.context
    })
    
    return analysis
  } catch (error) {
    console.error('Error analyzing query:', error)
    return {
      intent: 'general',
      shouldSearchLocations: true,
      shouldSearchGuides: true,
      shouldSearchUsers: true,
      locationSearchTerms: [query.trim()],
      categories: [],
      context: 'general',
      isFamilyQuery: false,
      isDateQuery: false,
      isGroupQuery: false,
      isSoloQuery: false,
      pricePreference: null,
      activityType: null
    }
  }
}

// Calculate location relevance based on AI analysis
function calculateLocationRelevance(location: any, analysis: any): number {
  let score = 0
  
  // Base score for matching name/description
  const locationText = `${location.name} ${location.description || ''} ${location.address || ''}`.toLowerCase()
  const queryTerms = analysis.locationSearchTerms.join(' ').toLowerCase()
  
  // More flexible matching for conversational queries
  const queryWords = queryTerms.split(' ').filter((word: string) => word.length > 2)
  const locationWords = locationText.split(' ').filter((word: string) => word.length > 2)
  
  // Check for word matches (more lenient)
  queryWords.forEach((queryWord: string) => {
    locationWords.forEach((locationWord: string) => {
      if (locationWord.includes(queryWord) || queryWord.includes(locationWord)) {
        score += 15 // Increased score for word matches
      }
    })
  })
  
  // Exact phrase matching (higher score)
  if (locationText.includes(queryTerms)) score += 60
  
  // Restaurant-specific scoring
  if (queryTerms.includes('restaurant') || queryTerms.includes('food') || queryTerms.includes('eat')) {
    const locationCategories = location.categories?.map((cat: any) => 
      typeof cat === 'string' ? cat.toLowerCase() : cat.name?.toLowerCase()
    ) || []
    
    // Check if location is a restaurant/food establishment
    const foodKeywords = ['restaurant', 'cafe', 'bar', 'food', 'dining', 'eatery', 'bistro', 'grill']
    const isFoodEstablishment = foodKeywords.some(keyword => 
      locationCategories.includes(keyword) || locationText.includes(keyword)
    )
    
    if (isFoodEstablishment) {
      score += 40 // High score for food establishments when searching for food
    }
  }
  
  // Category matching
  if (location.categories) {
    const locationCategories = location.categories.map((cat: any) => 
      typeof cat === 'string' ? cat.toLowerCase() : cat.name?.toLowerCase()
    )
    
    analysis.categories.forEach((category: string) => {
      if (locationCategories.includes(category.toLowerCase())) {
        score += 35
      }
    })
  }
  
  // Context-specific scoring
  if (analysis.isFamilyQuery && location.familyFriendly) score += 40
  if (analysis.isDateQuery && location.romantic) score += 40
  if (analysis.isGroupQuery && location.groupFriendly) score += 40
  
  // Price preference matching
  if (analysis.pricePreference && location.priceRange) {
    if (analysis.pricePreference === 'budget' && location.priceRange === 'budget') score += 20
    if (analysis.pricePreference === 'expensive' && location.priceRange === 'expensive') score += 20
  }
  
  // Quality indicators
  if (location.isVerified) score += 20 // Increased verification bonus
  if (location.averageRating >= 4.5) score += 15
  else if (location.averageRating >= 4.0) score += 8
  if (location.isFeatured) score += 10
  
  // Minimum score for any location to be included
  if (score === 0) score = 5 // Increased minimum score
  
  return score
}

// Generate AI insights for search results
async function generateAISearchInsights(query: string, results: any, analysis: any) {
  try {
    const totalResults = results.locations.length + results.guides.length + results.users.length
    
    const insights = {
      summary: '',
      recommendations: [] as string[],
      context: analysis.context,
      totalResults: totalResults
    }
    
    // Generate contextual summary
    if (analysis.isFamilyQuery) {
      insights.summary = `Found ${results.locations.length} family-friendly places near you. These locations are perfect for activities with kids and family outings.`
      insights.recommendations = [
        'Look for places with playgrounds or interactive exhibits',
        'Check if the venue has kid-friendly menus',
        'Consider outdoor locations for active children'
      ]
    } else if (analysis.isDateQuery) {
      insights.summary = `Found ${results.locations.length} romantic and date-worthy locations. These spots are ideal for couples looking for quality time together.`
      insights.recommendations = [
        'Consider making reservations for popular restaurants',
        'Look for places with intimate atmospheres',
        'Check if the venue offers special date packages'
      ]
    } else if (analysis.isGroupQuery) {
      insights.summary = `Found ${results.locations.length} great spots for group activities. These venues are perfect for social gatherings with friends.`
      insights.recommendations = [
        'Look for places with large seating areas',
        'Consider venues with entertainment options',
        'Check if they offer group discounts'
      ]
    } else if (totalResults === 0) {
      insights.summary = `I couldn't find any specific results for "${query}". Let me help you discover some great places!`
      insights.recommendations = [
        'Try searching for a specific type of place (e.g., "restaurants", "cafes", "parks")',
        'Check your spelling or try a broader search term',
        'Explore our suggested searches below'
      ]
    } else {
      insights.summary = `Found ${totalResults} results for "${query}". Here are some great options to explore.`
    }
    
    return insights
  } catch (error) {
    console.error('Error generating AI insights:', error)
    return {
      summary: `Found ${results.locations.length + results.guides.length + results.users.length} results for your search.`,
      recommendations: [],
      context: 'general',
      totalResults: results.locations.length + results.guides.length + results.users.length
    }
  }
}

// Generate suggested queries based on current search
async function generateSuggestedQueries(query: string, results: any, analysis: any) {
  const suggestions = []
  
  if (analysis.isFamilyQuery) {
    suggestions.push('Family restaurants near me', 'Kid-friendly activities', 'Parks with playgrounds')
  } else if (analysis.isDateQuery) {
    suggestions.push('Romantic restaurants', 'Date night ideas', 'Couple activities')
  } else if (analysis.isGroupQuery) {
    suggestions.push('Group dining options', 'Party venues', 'Social activities')
  } else {
    suggestions.push('Restaurants near me', 'Things to do today', 'Popular places')
  }
  
  return suggestions
}

// Helper function to format address
function formatAddress(address: any): string {
  if (typeof address === 'string') return address
  if (!address) return 'Address not available'
  
  const parts = [
    address.street,
    address.city,
    address.state,
    address.zip
  ].filter(Boolean)
  
  return parts.join(', ') || 'Address not available'
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
  return R * c
} 