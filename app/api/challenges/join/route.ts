import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

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

    const { challengeId } = await request.json()

    if (!challengeId) {
      return NextResponse.json({
        success: false,
        error: 'Challenge ID is required'
      }, { status: 400 })
    }

    console.log('🔍 Joining challenge:', { challengeId, userId: user.id })

    // Find the challenge in the challenges collection
    const challenge = await payload.findByID({
      collection: 'challenges',
      id: challengeId,
      depth: 1
    })

    if (!challenge) {
      return NextResponse.json({
        success: false,
        error: 'Challenge not found'
      }, { status: 404 })
    }

    // Check if challenge is active
    if (challenge.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Challenge is not active'
      }, { status: 400 })
    }

    // Check if challenge has expired
    if (challenge.expiresAt && new Date(challenge.expiresAt) < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'Challenge has expired'
      }, { status: 400 })
    }

    // Check if user has already joined
    const currentParticipants = challenge.participants || []
    const isAlreadyJoined = currentParticipants.some((participant: any) => 
      participant.id === user.id || participant === user.id
    )

    if (isAlreadyJoined) {
      return NextResponse.json({
        success: false,
        error: 'Already joined this challenge'
      }, { status: 400 })
    }

    // Add user to challenge participants
    const updatedChallenge = await payload.update({
      collection: 'challenges',
      id: challengeId,
      data: {
        participants: [...currentParticipants, user.id],
        participantCount: currentParticipants.length + 1
      }
    })

    // Add challenge to user's joined challenges
    const userJoinedChallenges = user.joinedChallenges || []
    const challengeIdentifier = `${challengeId}-${challenge.title}`
    
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        joinedChallenges: [...userJoinedChallenges, challengeIdentifier]
      }
    })

    console.log('✅ User joined challenge successfully:', {
      challengeId,
      userId: user.id,
      participantCount: updatedChallenge.participantCount
    })

    return NextResponse.json({
      success: true,
      message: `Successfully joined "${challenge.title}" challenge!`,
      data: {
        challenge: {
          id: challenge.id,
          title: challenge.title,
          participantCount: updatedChallenge.participantCount
        }
      }
    })

  } catch (error) {
    console.error('❌ Error joining challenge:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to join challenge',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
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

    // Get user's joined challenges
    const userData = await payload.findByID({
      collection: 'users',
      id: user.id,
      depth: 1
    })

    const joinedChallenges = userData.joinedChallenges || []

    return NextResponse.json({
      success: true,
      data: {
        joinedChallenges
      }
    })

  } catch (error) {
    console.error('❌ Error fetching joined challenges:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch joined challenges',
      message: error instanceof Error ? error.message : 'Unknown error'
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