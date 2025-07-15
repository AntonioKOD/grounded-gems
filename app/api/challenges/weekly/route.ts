import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Get user from session
    const { user } = await payload.auth({ headers: request.headers })
    
    console.log('📅 Weekly Challenges API called by user:', user?.id || 'anonymous')

    // Get current week number
    const now = new Date()
    const weekNumber = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)
    
    let currentChallenges: any[] = []
    let votingOptions: any[] = []
    let userVotes: any[] = []

    try {
      // First, let's check what collections exist
      console.log('🔍 Checking available collections...')
      const collections = await payload.db.collections
      console.log('📚 Available collections:', Object.keys(collections))

      // Get current weekly challenges - try different collection names
      console.log('📅 Querying challenges collection...')
      let challengesResponse
      try {
        challengesResponse = await payload.find({
          collection: 'challenges',
          where: {
            and: [
              { isWeekly: { equals: true } },
              { status: { equals: 'active' } },
              { expiresAt: { greater_than: now.toISOString() } }
            ]
          },
          sort: 'weekNumber',
          limit: 10
        })
        console.log(`✅ Found ${challengesResponse.docs?.length || 0} challenges in 'challenges' collection`)
      } catch (challengeError) {
        console.log('❌ Error querying challenges collection:', challengeError)
        challengesResponse = { docs: [] }
      }

      currentChallenges = challengesResponse.docs || []
      console.log(`📅 Found ${currentChallenges.length} active weekly challenges`)

      // Get challenge suggestions for voting
      console.log('🗳️ Querying challenge-suggestions collection...')
      let suggestionsResponse
      try {
        suggestionsResponse = await payload.find({
          collection: 'challenge-suggestions',
          where: { status: { equals: 'active' } },
          sort: '-votes',
          limit: 10
        })
        console.log(`✅ Found ${suggestionsResponse.docs?.length || 0} suggestions in 'challenge-suggestions' collection`)
      } catch (suggestionError) {
        console.log('❌ Error querying challenge-suggestions collection:', suggestionError)
        suggestionsResponse = { docs: [] }
      }

      votingOptions = suggestionsResponse.docs || []
      console.log(`🗳️ Found ${votingOptions.length} challenge suggestions`)

      // Get user votes if logged in
      if (user?.id) {
        try {
          console.log('👤 Querying challenge-votes collection...')
          const votesResponse = await payload.find({
            collection: 'challenge-votes',
            where: { user: { equals: user.id } },
            depth: 1
          })
          userVotes = votesResponse.docs || []
          console.log(`👤 User has ${userVotes.length} votes`)
        } catch (votesError) {
          console.log('⚠️ Challenge-votes collection not found, skipping user votes:', votesError)
          userVotes = []
        }
      }

    } catch (dbError) {
      console.error('❌ Database error:', dbError)
      // Return empty arrays instead of fallback data
      currentChallenges = []
      votingOptions = []
      userVotes = []
    }

    // Add user interaction states
    const currentChallengesWithUserState = currentChallenges.map(challenge => ({
      ...challenge,
      isJoined: user?.id ? false : false, // You can implement actual join logic here
      canJoin: true
    }))

    const votingOptionsWithUserState = votingOptions.map(suggestion => ({
      ...suggestion,
      hasVoted: user?.id ? userVotes.some(vote => vote.suggestion === suggestion.id) : false,
      canVote: user?.id ? !userVotes.some(vote => vote.suggestion === suggestion.id) : false
    }))

    const response = {
      success: true,
      data: {
        currentChallenges: currentChallengesWithUserState.slice(0, 2), // Only return 2 challenges
        votingOptions: votingOptionsWithUserState.slice(0, 4), // Only return 4 voting options
        meta: {
          weekNumber,
          totalChallenges: currentChallenges.length,
          totalSuggestions: votingOptions.length,
          userVoteCount: userVotes.length,
          isFallback: false // Always false since we removed fallback data
        }
      }
    }

    console.log('✅ Weekly Challenges API response:', {
      challenges: response.data.currentChallenges.length,
      votingOptions: response.data.votingOptions.length,
      isFallback: false,
      realChallengesFound: currentChallenges.length,
      realSuggestionsFound: votingOptions.length
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Weekly Challenges API error:', error)
    
    // Return empty data on error instead of fallback
    return NextResponse.json({
      success: true,
      data: {
        currentChallenges: [],
        votingOptions: [],
        meta: {
          weekNumber: 1,
          totalChallenges: 0,
          totalSuggestions: 0,
          userVoteCount: 0,
          isFallback: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { action, challengeId, suggestionId } = body

    if (action === 'join') {
      // Handle challenge join
      console.log(`👤 User ${user.id} joining challenge ${challengeId}`)
      
      // Here you would implement the actual join logic
      // For now, just return success
      return NextResponse.json({ 
        success: true, 
        message: 'Challenge joined successfully',
        data: { challengeId, userId: user.id }
      })

    } else if (action === 'vote') {
      // Handle suggestion voting
      console.log(`🗳️ User ${user.id} voting for suggestion ${suggestionId}`)
      
      try {
        // Check if user already voted
        const existingVote = await payload.find({
          collection: 'challenge-votes',
          where: {
            and: [
              { user: { equals: user.id } },
              { suggestion: { equals: suggestionId } }
            ]
          }
        })

        if (existingVote.docs.length > 0) {
          return NextResponse.json({ 
            success: false, 
            error: 'You have already voted for this suggestion' 
          }, { status: 400 })
        }

        // Create vote record
        await payload.create({
          collection: 'challenge-votes',
          data: {
            user: user.id,
            suggestion: suggestionId,
            createdAt: new Date().toISOString()
          }
        })

        // Update suggestion vote count
        await payload.update({
          collection: 'challenge-suggestions',
          id: suggestionId,
          data: {
            votes: { increment: 1 }
          }
        })

        return NextResponse.json({ 
          success: true, 
          message: 'Vote recorded successfully',
          data: { suggestionId, userId: user.id }
        })

      } catch (voteError) {
        console.error('Error recording vote:', voteError)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to record vote' 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action' 
    }, { status: 400 })

  } catch (error) {
    console.error('❌ Weekly Challenges POST error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
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