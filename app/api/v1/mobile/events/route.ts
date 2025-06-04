import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Query parameters validation schema
const eventsQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('20'),
  search: z.string().optional(),
  category: z.string().optional(),
  eventType: z.string().optional(),
  status: z.enum(['draft', 'published', 'cancelled', 'postponed']).default('published'),
  sortBy: z.enum(['startDate', 'name', 'createdAt', 'popularity']).default('startDate'),
  // TODO: Add location-based filtering (latitude, longitude, radius)
});

export type RsvpStatus = 'going' | 'interested' | 'not_going' | null;

export interface MobileEventItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  startDate: string;
  endDate?: string;
  image?: {
    url: string;
    alt?: string;
  } | null;
  category?: string;
  eventType?: string;
  sportType?: string;
  location: {
    id: string;
    name: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  } | null;
  organizer: {
    id: string;
    name: string;
    profileImage?: { url: string } | null;
  } | null;
  capacity?: number;
  attendeeCount?: number;
  isFree: boolean;
  price?: number;
  currency?: string;
  status: string;
  tags?: string[];
  userRsvpStatus?: RsvpStatus;
  // TODO: Add user-specific fields like isAttending, isSaved
}

interface MobileEventsResponse {
  success: boolean;
  message: string;
  data?: {
    events: MobileEventItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    meta?: {
      appliedFilters: {
        search?: string;
        category?: string;
        eventType?: string;
        status: string;
        sortBy: string;
      };
    };
  };
  error?: string;
  code?: string;
}

// Helper to calculate distance (can be moved to a shared util if used elsewhere)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


export async function GET(request: NextRequest): Promise<NextResponse<MobileEventsResponse>> {
  try {
    const payload = await getPayload({ config });
    const { searchParams } = new URL(request.url);

    const queryValidation = eventsQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid query parameters',
          error: queryValidation.error.errors[0].message,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      search,
      category,
      eventType,
      status,
      sortBy,
    } = queryValidation.data;

    // Get current user (optional, for personalization later)
    let currentUser = null;
    let userRsvps: any[] = [];

    try {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers });
        currentUser = user;
        if (currentUser) {
          // Fetch all RSVPs for the current user to avoid N+1 queries later
          const rsvpResult = await payload.find({
            collection: 'eventRSVPs',
            where: {
              user: { equals: currentUser.id },
            },
            depth: 0, // We only need event ID and status
            limit: 500, // Assuming a user won't have more than 500 RSVPs visible at once
          });
          userRsvps = rsvpResult.docs;
        }
      }
    } catch (authError) {
      console.log('No authenticated user for events request');
    }

    const whereClause: any = {
      status: { equals: status },
      // Only show events starting from today or in the future by default
      startDate: { greater_than_equal: new Date().toISOString().split('T')[0] }
    };

    if (search) {
      whereClause.or = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (category) {
      whereClause.category = { equals: category };
    }
    if (eventType) {
      whereClause.eventType = { equals: eventType };
    }

    let sort: string = '-startDate'; // Default sort by newest first
    switch (sortBy) {
      case 'name':
        sort = 'name';
        break;
      case 'createdAt':
        sort = '-createdAt';
        break;
      case 'popularity': // Popularity might be based on attendeeCount or RSVPs later
        sort = '-attendeeCount'; // Placeholder, assuming attendeeCount exists
        break;
      case 'startDate':
      default:
        sort = 'startDate'; // Ascending for start date (upcoming first)
        break;
    }

    const eventsResult = await payload.find({
      collection: 'events',
      where: whereClause,
      sort,
      page,
      limit,
      depth: 2, // To populate location and organizer
    });

    const formattedEvents: MobileEventItem[] = eventsResult.docs.map((event: any) => {
      const location = event.location ? {
        id: typeof event.location === 'string' ? event.location : event.location.id,
        name: typeof event.location === 'string' ? 'N/A' : event.location.name,
        address: typeof event.location === 'object' ? \`\${event.location.address?.street || ''}, \${event.location.address?.city || ''}\`.trim().replace(/^, |, $/g, '') : undefined,
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

      let currentUserRsvpStatus: RsvpStatus = null;
      if (currentUser && userRsvps.length > 0) {
        const rsvp = userRsvps.find(r => (typeof r.event === 'string' ? r.event : r.event?.id) === event.id);
        if (rsvp) {
          currentUserRsvpStatus = rsvp.status as RsvpStatus;
        }
      }

      return {
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
        userRsvpStatus: currentUserRsvpStatus,
      };
    });

    const response: MobileEventsResponse = {
      success: true,
      message: 'Events retrieved successfully',
      data: {
        events: formattedEvents,
        pagination: {
          page: eventsResult.page,
          limit: eventsResult.limit,
          total: eventsResult.totalDocs,
          totalPages: eventsResult.totalPages,
          hasNext: eventsResult.hasNextPage,
          hasPrev: eventsResult.hasPrevPage,
        },
        meta: {
          appliedFilters: { search, category, eventType, status, sortBy },
        },
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': currentUser ? 'private, max-age=60' : 'public, max-age=300',
        'Vary': 'Authorization',
      },
    });

  } catch (error) {
    console.error('Mobile events error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Events service unavailable',
        code: 'SERVER_ERROR',
      },
      { status: 500 }
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
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
} 