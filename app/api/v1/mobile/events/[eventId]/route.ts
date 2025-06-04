import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { MobileEventItem, RsvpStatus } from '../route'; // Assuming MobileEventItem & RsvpStatus are exported

interface MobileEventDetailResponse {
  success: boolean;
  message: string;
  data?: MobileEventItem | null; // Single event or null if not found
  error?: string;
  code?: string;
}

interface RouteContext {
  params: {
    eventId: string;
  };
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse<MobileEventDetailResponse>> {
  try {
    const payload = await getPayload({ config });
    const { eventId } = context.params;

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Event ID is required',
          code: 'INVALID_REQUEST',
        },
        { status: 400 },
      );
    }

    // Get current user (optional, for personalization e.g., isAttending)
    let currentUser = null;
    let userRsvpForThisEvent: RsvpStatus = null;

    try {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers });
        currentUser = user;

        if (currentUser) {
          // Fetch RSVP for this specific event and current user
          const rsvpResult = await payload.find({
            collection: 'eventRSVPs',
            where: {
              user: { equals: currentUser.id },
              event: { equals: eventId },
            },
            limit: 1,
            depth: 0,
          });
          if (rsvpResult.docs.length > 0) {
            userRsvpForThisEvent = rsvpResult.docs[0].status as RsvpStatus;
          }
        }
      }
    } catch (authError) {
      console.log('No authenticated user for event detail request');
    }

    const event = await payload.findByID({
      collection: 'events',
      id: eventId,
      depth: 2, // Populate location, organizer, etc.
    });

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: 'Event not found',
          data: null,
          code: 'NOT_FOUND',
        },
        { status: 404 },
      );
    }
    
    // TODO: Check if currentUser is attending this event and add to response
    // let isAttending = false;
    // if (currentUser && event.rsvps) { // Assuming rsvps relation exists and is populated
    //   isAttending = event.rsvps.some((rsvp: any) => 
    //       (typeof rsvp.user === 'string' ? rsvp.user : rsvp.user?.id) === currentUser.id && rsvp.status === 'going'
    //   );
    // }

    const location = event.location ? {
      id: typeof event.location === 'string' ? event.location : event.location.id,
      name: typeof event.location === 'string' ? 'N/A' : event.location.name,
      address: typeof event.location === 'object' ? `${event.location.address?.street || ''}, ${event.location.address?.city || ''}`.trim().replace(/^, |, $/g, '') : undefined,
      coordinates: typeof event.location === 'object' && event.location.coordinates ? {
        latitude: event.location.coordinates.latitude,
        longitude: event.location.coordinates.longitude,
      } : undefined,
    } : null;

    const organizer = event.organizer ? {
      id: typeof event.organizer === 'string' ? event.organizer : event.organizer.id,
      name: typeof event.organizer === 'string' ? 'N/A' : event.organizer.name || 'Unknown Organizer',
      profileImage: typeof event.organizer === 'object' && event.organizer.profileImage ? {
            url: typeof event.organizer.profileImage === 'string' ? event.organizer.profileImage : event.organizer.profileImage.url
      } : null,
    } : null;
    
    const image = event.image ? {
      url: typeof event.image === 'string' ? event.image : event.image.url,
      alt: typeof event.image === 'object' ? event.image.alt : undefined,
    } : null;

    const formattedEvent: MobileEventItem = {
      id: event.id,
      name: event.name,
      slug: event.slug,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      image,
      category: event.category,
      eventType: event.eventType,
      sportType: event.sportType,
      location,
      organizer,
      capacity: event.capacity,
      attendeeCount: event.attendeeCount || 0, // Assuming attendeeCount field exists
      isFree: event.pricing?.isFree ?? true,
      price: event.pricing?.isFree === false ? event.pricing?.price : undefined,
      currency: event.pricing?.isFree === false ? event.pricing?.currency : undefined,
      status: event.status,
      tags: Array.isArray(event.tags) ? event.tags.map((t: any) => t.tag) : [],
      userRsvpStatus: userRsvpForThisEvent,
      // isUserAttending: isAttending, // Add this once RSVP logic is solid
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Event details retrieved successfully',
        data: formattedEvent,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error(`Error fetching event ${context.params.eventId}:`, error);
    // Handle CastError for invalid ID format
    if (error.name === 'CastError' || (error.message && error.message.includes('Cast to ObjectId failed'))) {
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
} 