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

    const { suggestionId, voteType } = await request.json()

    if (!suggestionId) {
      return NextResponse.json({
        success: false,
        error: 'Suggestion ID is required'
      }, { status: 400 })
    }

    if (!voteType || !['upvote', 'downvote'].includes(voteType)) {
      return NextResponse.json({
        success: false,
        error: 'Vote type must be "upvote" or "downvote"'
      }, { status: 400 })
    }

    console.log('🔍 Processing vote:', { suggestionId, voteType, userId: user.id })

    // Find the suggestion
    const suggestion = await payload.findByID({
      collection: 'challenge-suggestions',
      id: suggestionId,
      depth: 1
    })

    if (!suggestion) {
      return NextResponse.json({
        success: false,
        error: 'Suggestion not found'
      }, { status: 404 })
    }

    // Check if suggestion is in voting status
    if (suggestion.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Suggestion is not open for voting'
      }, { status: 400 })
    }

    // Check if voting has ended
    if (suggestion.votingEndsAt && new Date(suggestion.votingEndsAt) < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'Voting has ended for this suggestion'
      }, { status: 400 })
    }

    const currentVotes = suggestion.votes || []
    const currentDownvotes = suggestion.downvotes || []
    const currentVoteCount = suggestion.voteCount || 0
    const currentDownvoteCount = suggestion.downvoteCount || 0

    // Check if user has already voted
    const hasVoted = currentVotes.some((vote: any) => 
      vote.id === user.id || vote === user.id
    )
    const hasDownvoted = currentDownvotes.some((downvote: any) => 
      downvote.id === user.id || downvote === user.id
    )

    let updatedSuggestion
    let message = ''

    if (voteType === 'upvote') {
      if (hasVoted) {
        // Remove upvote
        const newVotes = currentVotes.filter((vote: any) => 
          vote.id !== user.id && vote !== user.id
        )
        
        updatedSuggestion = await payload.update({
          collection: 'challenge-suggestions',
          id: suggestionId,
          data: {
            votes: newVotes,
            voteCount: newVotes.length,
            netVotes: newVotes.length - currentDownvoteCount
          }
        })
        
        message = 'Upvote removed'
      } else {
        // Add upvote
        const newVotes = [...currentVotes, user.id]
        
        // Remove downvote if exists
        const newDownvotes = currentDownvotes.filter((downvote: any) => 
          downvote.id !== user.id && downvote !== user.id
        )
        
        updatedSuggestion = await payload.update({
          collection: 'challenge-suggestions',
          id: suggestionId,
          data: {
            votes: newVotes,
            downvotes: newDownvotes,
            voteCount: newVotes.length,
            downvoteCount: newDownvotes.length,
            netVotes: newVotes.length - newDownvotes.length
          }
        })
        
        message = 'Upvoted successfully'
      }
    } else {
      if (hasDownvoted) {
        // Remove downvote
        const newDownvotes = currentDownvotes.filter((downvote: any) => 
          downvote.id !== user.id && downvote !== user.id
        )
        
        updatedSuggestion = await payload.update({
          collection: 'challenge-suggestions',
          id: suggestionId,
          data: {
            downvotes: newDownvotes,
            downvoteCount: newDownvotes.length,
            netVotes: currentVoteCount - newDownvotes.length
          }
        })
        
        message = 'Downvote removed'
      } else {
        // Add downvote
        const newDownvotes = [...currentDownvotes, user.id]
        
        // Remove upvote if exists
        const newVotes = currentVotes.filter((vote: any) => 
          vote.id !== user.id && vote !== user.id
        )
        
        updatedSuggestion = await payload.update({
          collection: 'challenge-suggestions',
          id: suggestionId,
          data: {
            votes: newVotes,
            downvotes: newDownvotes,
            voteCount: newVotes.length,
            downvoteCount: newDownvotes.length,
            netVotes: newVotes.length - newDownvotes.length
          }
        })
        
        message = 'Downvoted successfully'
      }
    }

    console.log('✅ Vote processed successfully:', {
      suggestionId,
      voteType,
      userId: user.id,
      newVoteCount: updatedSuggestion.voteCount,
      newDownvoteCount: updatedSuggestion.downvoteCount,
      newNetVotes: updatedSuggestion.netVotes
    })

    return NextResponse.json({
      success: true,
      message,
      data: {
        suggestion: {
          id: updatedSuggestion.id,
          title: updatedSuggestion.title,
          voteCount: updatedSuggestion.voteCount,
          downvoteCount: updatedSuggestion.downvoteCount,
          netVotes: updatedSuggestion.netVotes
        }
      }
    })

  } catch (error) {
    console.error('❌ Error processing vote:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process vote',
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