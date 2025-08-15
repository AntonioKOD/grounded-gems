import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { z } from 'zod';
import { getAuthenticatedUser, getMobileUser } from '@/lib/auth-server';

const rsvpStatusSchema = z.enum(['going', 'interested', 'not_going']);

const rsvpRequestSchema = z.object({
  status: rsvpStatusSchema,
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
    const { eventId } = context.params;
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
    const { status } = validationResult.data;

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

    // Find existing RSVP
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
    
    // TODO: Potentially update event.attendeeCount based on 'going' status change

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