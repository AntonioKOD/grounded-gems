import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { z } from 'zod';
import { getAuthenticatedUser, getMobileUser } from '@/lib/auth-server';
import { sendPushNotification } from '@/lib/push-notifications';

const rsvpStatusSchema = z.enum(['going', 'interested', 'not_going', 'invited']);

const rsvpRequestSchema = z.object({
  status: rsvpStatusSchema,
  invitedUserId: z.string().optional(),
});

interface RsvpResponse {
  success: boolean;
  message: string;
  data?: {
    eventId: string;
    userId: string;
    status: z.infer<typeof rsvpStatusSchema>;
    rsvpId?: string;
  };
  error?: string;
  code?: string;
}

interface RouteContext {
  params: {
    eventId: string;
  };
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse<RsvpResponse>> {
  try {
    const payload = await getPayload({ config });
    const { eventId } = await context.params;
    const body = await request.json();

    const validationResult = rsvpRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request body',
          error: validationResult.error.errors[0]?.message,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 },
      );
    }
    const { status, invitedUserId } = validationResult.data;

    let currentUser = null
    
    // Try to authenticate using Payload directly
    try {
      const authResult = await payload.auth({ headers: request.headers })
      currentUser = authResult.user
      console.log('🔐 [Events RSVP API] Direct Payload authentication successful')
    } catch (authError) {
      console.log('❌ [Events RSVP API] Direct Payload authentication failed:', authError instanceof Error ? authError.message : String(authError))
    }
    
    if (!currentUser) {
      return NextResponse.json({ success: false, message: 'Authentication required', code: 'NO_TOKEN' }, { status: 401 });
    }

    // Check if event exists
    const event = await payload.findByID({
      collection: 'events',
      id: eventId,
      depth: 0,
    });
    if (!event) {
      return NextResponse.json({ success: false, message: 'Event not found', code: 'EVENT_NOT_FOUND' }, { status: 404 });
    }

    // Handle invited users (when current user is inviting someone else)
    if (status === 'invited' && invitedUserId) {
      // Check if the invited user already has an RSVP
      const { docs: existingInvitedRsvps } = await payload.find({
        collection: 'eventRSVPs',
        where: {
          and: [
            { event: { equals: eventId } },
            { user: { equals: invitedUserId } },
          ],
        },
        limit: 1,
      });

      let shouldUpdateCounts = false;
      
      if (existingInvitedRsvps.length > 0 && existingInvitedRsvps[0]?.id) {
        // Update existing RSVP for invited user
        const rsvpResult = await payload.update({
          collection: 'eventRSVPs',
          id: String(existingInvitedRsvps[0].id),
          data: { 
            status: 'invited',
            invitedBy: currentUser.id,
            invitedAt: new Date().toISOString(),
          },
        });
        console.log(`RSVP updated for invited user ${invitedUserId} to event ${eventId} by ${currentUser.id}`);
        // Only update counts if the status actually changed
        if (existingInvitedRsvps[0].status !== 'invited') {
          shouldUpdateCounts = true;
        }
      } else {
        // Create new RSVP for invited user
        const rsvpResult = await payload.create({
          collection: 'eventRSVPs',
          data: {
            event: eventId,
            user: invitedUserId,
            status: 'invited',
            invitedBy: currentUser.id,
            invitedAt: new Date().toISOString(),
          },
        });
        console.log(`RSVP created for invited user ${invitedUserId} to event ${eventId} by ${currentUser.id}`);
        shouldUpdateCounts = true; // New invitation, definitely update counts
      }

      // Update event participant counts for invitation
      if (shouldUpdateCounts) {
        try {
          // Use direct database update to avoid triggering beforeChange hooks
          if (payload.db?.collections?.events) {
            await payload.db.collections.events.updateOne(
              { _id: eventId },
              { $inc: { invitedCount: 1 } }
            );
          }
          
          console.log(`Updated event ${eventId} invited count via direct DB update`);
        } catch (updateError) {
          console.error('Error updating event invited count:', updateError);
        }
      }

      // Send push notification to invited user
      try {
        await sendPushNotification(invitedUserId, {
          title: `You're invited to ${event.name}!`,
          body: `${currentUser.name || 'Someone'} invited you to "${event.name}" on ${new Date(event.startDate).toLocaleDateString()}.`,
          data: {
            type: 'event_invitation',
            eventId: eventId,
            invitedBy: String(currentUser.id)
          },
          badge: 1
        })
        console.log(`🔔 [RSVP] Sent invitation push notification to user ${invitedUserId}`)
      } catch (error) {
        console.error('Error sending invitation push notification:', error)
      }

      return NextResponse.json(
        {
          success: true,
          message: `Successfully invited user to event`,
          data: {
            eventId,
            userId: invitedUserId,
            status: 'invited',
            invitedBy: String(currentUser.id),
          },
        },
        { status: 201 },
      );
    }

    // Handle regular RSVP (current user's own RSVP)
    const { docs: existingRsvps } = await payload.find({
      collection: 'eventRSVPs',
      where: {
        and: [
          { event: { equals: eventId } },
          { user: { equals: currentUser.id } },
        ],
      },
      limit: 1,
    });

    let rsvpResult;
    if (existingRsvps.length > 0 && existingRsvps[0]?.id) {
      // Update existing RSVP
      rsvpResult = await payload.update({
        collection: 'eventRSVPs',
        id: String(existingRsvps[0].id),
        data: { status },
      });
      console.log(`RSVP updated for event ${eventId}, user ${currentUser.id} to status ${status}`);
    } else {
      // Create new RSVP
      rsvpResult = await payload.create({
        collection: 'eventRSVPs',
        data: {
          event: eventId,
          user: currentUser.id,
          status,
        },
      });
      console.log(`RSVP created for event ${eventId}, user ${currentUser.id} with status ${status}`);
    }

    // Send push notification to event organizer when someone joins
    if (status === 'going' && event.organizer && event.organizer !== currentUser.id) {
      try {
        await sendPushNotification(String(event.organizer), {
          title: `Someone joined your event!`,
          body: `${currentUser.name || 'Someone'} is going to "${event.name}"!`,
          data: {
            type: 'event_rsvp',
            eventId: eventId,
            rsvpUserId: String(currentUser.id),
            rsvpStatus: status
          },
          badge: 1
        })
        console.log(`🔔 [RSVP] Sent RSVP notification to event organizer`)
      } catch (error) {
        console.error('Error sending RSVP notification to organizer:', error)
      }
    }
    
    // Update event participant counts based on RSVP status change
    try {
      // Get the old status if updating an existing RSVP
      let oldStatus = null;
      if (existingRsvps.length > 0 && existingRsvps[0]?.status) {
        oldStatus = existingRsvps[0].status;
      }
      
      // Use direct database updates to avoid triggering beforeChange hooks
      const db = payload.db;
      const updateData: any = {};
      
      // Remove from old status count
      if (oldStatus) {
        if (oldStatus === 'going') updateData.$inc = { goingCount: -1 };
        else if (oldStatus === 'interested') updateData.$inc = { interestedCount: -1 };
        else if (oldStatus === 'invited') updateData.$inc = { invitedCount: -1 };
      }
      
      // Add to new status count
      if (status === 'going') {
        if (updateData.$inc) {
          updateData.$inc.goingCount = (updateData.$inc.goingCount || 0) + 1;
        } else {
          updateData.$inc = { goingCount: 1 };
        }
      } else if (status === 'interested') {
        if (updateData.$inc) {
          updateData.$inc.interestedCount = (updateData.$inc.interestedCount || 0) + 1;
        } else {
          updateData.$inc = { interestedCount: 1 };
        }
      } else if (status === 'invited') {
        if (updateData.$inc) {
          updateData.$inc.invitedCount = (updateData.$inc.invitedCount || 0) + 1;
        } else {
          updateData.$inc = { invitedCount: 1 };
        }
      }
      
      if (Object.keys(updateData).length > 0) {
        if (payload.db?.collections?.events) {
          await payload.db.collections.events.updateOne(
            { _id: eventId },
            updateData
          );
        }
        
        console.log(`Updated event ${eventId} counts via direct DB update:`, updateData);
      }
    } catch (updateError) {
      console.error('Error updating event participant counts:', updateError);
      // Don't fail the RSVP operation if count update fails
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully RSVP'd as ${status}`,
        data: {
          eventId,
          userId: String(currentUser.id),
          status,
          rsvpId: 'id' in rsvpResult && rsvpResult.id !== undefined ? String(rsvpResult.id) : undefined,
        },
      },
      { status: existingRsvps.length > 0 ? 200 : 201 },
    );

  } catch (error: any) {
    console.error(`Error RSVPing to event ${context.params.eventId}:`, error);
    if (error.name === 'CastError') {
        return NextResponse.json(
            { success: false, message: 'Invalid Event ID format', code: 'INVALID_ID_FORMAT' },
            { status: 400 },
        );
    }
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 },
    );
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
  });
} 