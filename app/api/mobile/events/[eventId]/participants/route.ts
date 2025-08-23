import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getMobileUser } from '@/lib/auth-server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface MobileParticipantResponse {
  success: boolean
  message: string
  data?: {
    participants: Array<{
      id: string
      userId: string
      eventId: string
      status: string
      createdAt: string
      user?: {
        id: string
        name: string
        avatar?: string
      }
      invitedBy?: {
        id: string
        name: string
        avatar?: string
      }
      checkInTime?: string
      isCheckedIn: boolean
    }>
    totalCount: number
  }
  error?: string
  code?: string
}

interface RouteContext {
  params: Promise<{
    eventId: string
  }>
}

// GET /api/mobile/events/[eventId]/participants - Get event participants
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse<MobileParticipantResponse>> {
  try {
    const { eventId } = await context.params
    
    const payload = await getPayload({ config })
    
    let currentUser = null
    
    // Try to authenticate using Payload directly
    try {
      const authResult = await payload.auth({ headers: request.headers })
      currentUser = authResult.user
      console.log('🔐 [Events Participants API] Direct Payload authentication successful')
    } catch (authError) {
      console.log('❌ [Events Participants API] Direct Payload authentication failed:', authError instanceof Error ? authError.message : String(authError))
    }
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get the event to check access permissions
    const event = await payload.findByID({
      collection: 'events',
      id: eventId,
      depth: 0
    })

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found', message: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this event
    const hasAccess = event.privacy === 'public' || 
                     event.organizer === currentUser.id ||
                     (event.privacy === 'private' && event.privateAccess?.includes(currentUser.id))

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied', message: 'Access denied' },
        { status: 403 }
      )
    }

    // Get event participants
    const participants = await payload.find({
      collection: 'eventRSVPs',
      where: {
        event: { equals: eventId }
      },
      depth: 2,
      sort: '-createdAt'
    })

    const formattedParticipants = participants.docs.map((participant: any) => ({
      id: participant.id,
      userId: participant.user?.id || participant.user,
      eventId: participant.event?.id || participant.event,
      status: participant.status,
      createdAt: participant.createdAt,
      user: participant.user ? {
        id: typeof participant.user === 'string' ? participant.user : participant.user.id,
        name: typeof participant.user === 'string' ? 'Unknown User' : participant.user.name,
        avatar: typeof participant.user === 'string' ? undefined : participant.user.profileImage?.url
      } : undefined,
      invitedBy: participant.invitedBy ? {
        id: typeof participant.invitedBy === 'string' ? participant.invitedBy : participant.invitedBy.id,
        name: typeof participant.invitedBy === 'string' ? 'Unknown User' : participant.invitedBy.name,
        avatar: typeof participant.invitedBy === 'string' ? undefined : participant.invitedBy.profileImage?.url
      } : undefined,
      checkInTime: participant.checkInTime,
      isCheckedIn: participant.isCheckedIn || false
    }))

    return NextResponse.json({
      success: true,
      message: 'Participants retrieved successfully',
      data: {
        participants: formattedParticipants,
        totalCount: formattedParticipants.length
      }
    })

  } catch (error) {
    console.error('Mobile API: Error getting event participants:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get participants',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
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