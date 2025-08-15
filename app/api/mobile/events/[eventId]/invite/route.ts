import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, getMobileUser } from '@/lib/auth-server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface MobileInviteResponse {
  success: boolean
  message: string
  data?: {
    invitedUsers: string[]
    totalInvited: number
  }
  error?: string
  code?: string
}

interface RouteContext {
  params: {
    eventId: string
  }
}

// POST /api/mobile/events/[eventId]/invite - Invite users to event
export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse<MobileInviteResponse>> {
  try {
    const { eventId } = context.params
    
    const payload = await getPayload({ config })
    
    let currentUser = null
    
    // Try to authenticate using Payload directly
    try {
      const authResult = await payload.auth({ headers: request.headers })
      currentUser = authResult.user
      console.log('🔐 [Events Invite API] Direct Payload authentication successful')
    } catch (authError) {
      console.log('❌ [Events Invite API] Direct Payload authentication failed:', authError instanceof Error ? authError.message : String(authError))
    }
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required', message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { userIds } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User IDs are required', message: 'User IDs are required' },
        { status: 400 }
      )
    }

    // Get the event to check permissions
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

    // Check if user can invite to this event
    const canInvite = event.organizer === currentUser.id || 
                     event.coOrganizers?.includes(currentUser.id) ||
                     currentUser.role === 'admin'

    if (!canInvite) {
      return NextResponse.json(
        { success: false, error: 'You can only invite users to events you organize', message: 'You can only invite users to events you organize' },
        { status: 403 }
      )
    }

    const invitedUsers: string[] = []
    const failedInvites: string[] = []

    // Process each user invitation
    for (const userId of userIds) {
      try {
        // Check if user exists
        const invitedUser = await payload.findByID({
          collection: 'users',
          id: userId,
          depth: 0
        })

        if (!invitedUser) {
          failedInvites.push(userId)
          continue
        }

        // Check if user is already invited or participating
        const existingRSVP = await payload.find({
          collection: 'eventRSVPs',
          where: {
            and: [
              { event: { equals: eventId } },
              { user: { equals: userId } }
            ]
          },
          limit: 1
        })

        if (existingRSVP.docs.length > 0) {
          // User already has an RSVP, skip
          continue
        }

        // Create RSVP with invited status
        await payload.create({
          collection: 'eventRSVPs',
          data: {
            event: eventId,
            user: userId,
            status: 'invited',
            invitedBy: currentUser.id,
            createdAt: new Date().toISOString()
          }
        })

        invitedUsers.push(userId)

        // Create notification for invited user
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: userId,
            type: 'event_invitation',
            title: `You're invited to ${event.name}`,
            message: `${currentUser.name} invited you to "${event.name}" on ${new Date(event.startDate).toLocaleDateString()}.`,
            relatedTo: {
              relationTo: 'events',
              value: eventId,
            },
            actionBy: currentUser.id,
            metadata: {
              eventName: event.name,
              eventDate: event.startDate,
              organizerName: currentUser.name,
            },
            priority: 'normal',
            read: false,
          },
        })

      } catch (error) {
        console.error(`Failed to invite user ${userId}:`, error)
        failedInvites.push(userId)
      }
    }

    // Update event invited count
    if (invitedUsers.length > 0) {
      try {
        await payload.update({
          collection: 'events',
          id: eventId,
          data: {
            invitedCount: (event.invitedCount || 0) + invitedUsers.length
          }
        })
      } catch (error) {
        console.error('Failed to update event invited count:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully invited ${invitedUsers.length} users${failedInvites.length > 0 ? `, ${failedInvites.length} failed` : ''}`,
      data: {
        invitedUsers,
        totalInvited: invitedUsers.length
      }
    })

  } catch (error) {
    console.error('Mobile API: Error inviting users to event:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to invite users',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 