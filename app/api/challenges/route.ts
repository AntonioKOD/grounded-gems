import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Get user from session
    const { user } = await payload.auth({ headers: request.headers })
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const status = searchParams.get('status') || 'active'
    const isWeekly = searchParams.get('isWeekly')
    const featured = searchParams.get('featured')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Get current week and year for weekly challenges
    const now = new Date()
    const currentWeek = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)
    const currentYear = now.getFullYear()
    
    // Build query
    const query: any = {
      status: { equals: status }
    }
    
    // Add filters
    if (category) {
      query.category = { equals: category }
    }
    
    if (difficulty) {
      query.difficulty = { equals: difficulty }
    }
    
    if (isWeekly === 'true') {
      query.isWeekly = { equals: true }
      query.weekNumber = { equals: currentWeek }
      query.year = { equals: currentYear }
    }
    
    if (featured === 'true') {
      query.featured = { equals: true }
    }
    
    // Add date filters for active challenges
    if (status === 'active') {
      query.and = [
        {
          or: [
            { startsAt: { exists: false } },
            { startsAt: { less_than_equal: now.toISOString() } }
          ]
        },
        {
          or: [
            { expiresAt: { exists: false } },
            { expiresAt: { greater_than: now.toISOString() } }
          ]
        }
      ]
    }
    
    console.log('🔍 Fetching challenges with query:', {
      query,
      page,
      limit,
      sortBy,
      sortOrder,
      currentWeek,
      currentYear,
      userId: user?.id
    })
    
    // Fetch challenges
    const challenges = await payload.find({
      collection: 'challenges',
      where: query,
      page,
      limit,
      sort: `${sortBy}:${sortOrder}`,
      depth: 2
    })
    
    // Update user interaction states if user is logged in
    if (user?.id && challenges.docs.length > 0) {
      await updateUserInteractionStates(challenges.docs, user?.id as string, payload)
    }
    
    // Transform challenges for frontend
    const transformedChallenges = challenges.docs.map(challenge => ({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      shortDescription: challenge.shortDescription,
      category: challenge.category,
      difficulty: challenge.difficulty,
      reward: challenge.reward,
      rewardPoints: challenge.rewardPoints,
      requirements: challenge.requirements || [],
      status: challenge.status,
      isWeekly: challenge.isWeekly,
      weekNumber: challenge.weekNumber,
      year: challenge.year,
      startsAt: challenge.startsAt,
      expiresAt: challenge.expiresAt,
      participantCount: challenge.participantCount || 0,
      completionCount: challenge.completionCount || 0,
      image: challenge.image,
      tags: challenge.tags || [],
      locationBased: challenge.locationBased,
      maxDistance: challenge.maxDistance,
      weatherDependent: challenge.weatherDependent,
      estimatedDuration: challenge.estimatedDuration,
      cost: challenge.cost,
      socialSharing: challenge.socialSharing,
      featured: challenge.featured,
      createdAt: challenge.createdAt,
      updatedAt: challenge.updatedAt,
      // User interaction states
      isJoined: challenge.isJoined || false,
      isCompleted: challenge.isCompleted || false,
      canJoin: challenge.canJoin !== false,
      canComplete: challenge.canComplete !== false
    }))
    
    console.log('✅ Challenges API returned', transformedChallenges.length, 'challenges')
    
    return NextResponse.json({
      success: true,
      data: {
        challenges: transformedChallenges,
        pagination: {
          page: challenges.page,
          limit: challenges.limit,
          totalPages: challenges.totalPages,
          totalDocs: challenges.totalDocs,
          hasNextPage: challenges.hasNextPage,
          hasPrevPage: challenges.hasPrevPage,
          nextPage: challenges.nextPage,
          prevPage: challenges.prevPage
        },
        meta: {
          currentWeek,
          currentYear,
          filters: {
            category,
            difficulty,
            status,
            isWeekly,
            featured
          },
          sortBy,
          sortOrder
        }
      }
    })
    
  } catch (error) {
    console.error('❌ Challenges API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch challenges',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get user from session
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const challengeData = await request.json()

    // Validate required fields
    const requiredFields = ['title', 'description', 'category', 'difficulty']
    for (const field of requiredFields) {
      if (!challengeData[field]) {
        return NextResponse.json({
          success: false,
          error: `${field} is required`
        }, { status: 400 })
      }
    }

    console.log('🔍 Creating challenge:', {
      title: challengeData.title,
      category: challengeData.category,
      userId: user.id
    })

    // Create the challenge
    const challenge = await payload.create({
      collection: 'challenges',
      data: {
        ...challengeData,
        createdBy: user.id,
        participantCount: 0,
        completionCount: 0
      }
    })

    console.log('✅ Challenge created successfully:', challenge.id)

    return NextResponse.json({
      success: true,
      message: 'Challenge created successfully!',
      data: {
        challenge: {
          id: challenge.id,
          title: challenge.title,
          status: challenge.status
        }
      }
    })

  } catch (error) {
    console.error('❌ Error creating challenge:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create challenge',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Update user interaction states for challenges
 */
async function updateUserInteractionStates(
  challenges: any[],
  userId: string,
  payload: any
): Promise<void> {
  try {
    // Get user with their joined challenges
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 1
    })
    
    const joinedChallengeIds = new Set((user.joinedChallenges || []).map((challenge: any) => 
      typeof challenge === 'string' ? challenge : challenge?.id
    ))
    
    // Update challenge interaction states
    challenges.forEach(challenge => {
      challenge.isJoined = joinedChallengeIds.has(challenge.id)
      challenge.canJoin = challenge.status === 'active' && !challenge.isJoined
      challenge.canComplete = challenge.isJoined && challenge.status === 'active'
    })
  } catch (error) {
    console.error('Error updating user interaction states:', error)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
} 