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
    const status = searchParams.get('status') || 'pending'
    const category = searchParams.get('category')
    const featured = searchParams.get('featured')
    const sortBy = searchParams.get('sortBy') || 'netVotes'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Build query
    const query: any = {
      status: { equals: status }
    }
    
    if (category) {
      query.category = { equals: category }
    }
    
    if (featured === 'true') {
      query.featured = { equals: true }
    }
    
    console.log('🔍 Fetching challenge suggestions with query:', {
      query,
      page,
      limit,
      sortBy,
      sortOrder,
      userId: user?.id
    })
    
    // Fetch suggestions
    const suggestions = await payload.find({
      collection: 'challenge-suggestions',
      where: query,
      page,
      limit,
      sort: `${sortBy}:${sortOrder}`,
      depth: 2
    })
    
    // Update user interaction states if user is logged in
    if (user?.id && suggestions.docs.length > 0) {
      await updateUserInteractionStates(suggestions.docs, user?.id as string, payload)
    }
    
    // Transform suggestions for frontend
    const transformedSuggestions = suggestions.docs.map(suggestion => ({
      id: suggestion.id,
      title: suggestion.title,
      description: suggestion.description,
      category: suggestion.category,
      difficulty: suggestion.difficulty,
      estimatedDuration: suggestion.estimatedDuration,
      cost: suggestion.cost,
      status: suggestion.status,
      voteCount: suggestion.voteCount || 0,
      downvoteCount: suggestion.downvoteCount || 0,
      netVotes: suggestion.netVotes || 0,
      tags: suggestion.tags || [],
      locationBased: suggestion.locationBased,
      weatherDependent: suggestion.weatherDependent,
      seasonal: suggestion.seasonal,
      targetSeason: suggestion.targetSeason,
      featured: suggestion.featured,
      votingEndsAt: suggestion.votingEndsAt,
      createdAt: suggestion.createdAt,
      updatedAt: suggestion.updatedAt,
      suggestedBy: suggestion.suggestedBy,
      // User interaction states
      hasVoted: suggestion.hasVoted || false,
      hasDownvoted: suggestion.hasDownvoted || false,
      canVote: suggestion.canVote !== false,
      canDownvote: suggestion.canDownvote !== false
    }))
    
    console.log('✅ Challenge suggestions API returned', transformedSuggestions.length, 'suggestions')
    
    return NextResponse.json({
      success: true,
      data: {
        suggestions: transformedSuggestions,
        pagination: {
          page: suggestions.page,
          limit: suggestions.limit,
          totalPages: suggestions.totalPages,
          totalDocs: suggestions.totalDocs,
          hasNextPage: suggestions.hasNextPage,
          hasPrevPage: suggestions.hasPrevPage,
          nextPage: suggestions.nextPage,
          prevPage: suggestions.prevPage
        },
        meta: {
          filters: {
            status,
            category,
            featured
          },
          sortBy,
          sortOrder
        }
      }
    })
    
  } catch (error) {
    console.error('❌ Challenge suggestions API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch challenge suggestions',
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

    const suggestionData = await request.json()

    // Validate required fields
    const requiredFields = ['title', 'description', 'category', 'difficulty']
    for (const field of requiredFields) {
      if (!suggestionData[field]) {
        return NextResponse.json({
          success: false,
          error: `${field} is required`
        }, { status: 400 })
      }
    }

    console.log('🔍 Creating challenge suggestion:', {
      title: suggestionData.title,
      category: suggestionData.category,
      userId: user.id
    })

    // Create the suggestion
    const suggestion = await payload.create({
      collection: 'challenge-suggestions',
      data: {
        ...suggestionData,
        suggestedBy: user.id,
        status: 'pending'
      }
    })

    console.log('✅ Challenge suggestion created successfully:', suggestion.id)

    return NextResponse.json({
      success: true,
      message: 'Challenge suggestion submitted successfully!',
      data: {
        suggestion: {
          id: suggestion.id,
          title: suggestion.title,
          status: suggestion.status
        }
      }
    })

  } catch (error) {
    console.error('❌ Error creating challenge suggestion:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create challenge suggestion',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Update user interaction states for suggestions
 */
async function updateUserInteractionStates(
  suggestions: any[],
  userId: string,
  payload: any
): Promise<void> {
  try {
    // Update suggestion interaction states
    suggestions.forEach(suggestion => {
      const votes = suggestion.votes || []
      const downvotes = suggestion.downvotes || []
      
      suggestion.hasVoted = votes.some((vote: any) => 
        vote.id === userId || vote === userId
      )
      suggestion.hasDownvoted = downvotes.some((downvote: any) => 
        downvote.id === userId || downvote === userId
      )
      suggestion.canVote = !suggestion.hasVoted && suggestion.status === 'pending'
      suggestion.canDownvote = !suggestion.hasDownvoted && suggestion.status === 'pending'
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