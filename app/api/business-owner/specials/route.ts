import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '../../../../payload.config';

interface CreateSpecialRequest {
  locationId: string;
  title: string;
  description: string;
  shortDescription?: string;
  specialType: 'discount' | 'happy_hour' | 'bundle' | 'other';
  discountValue?: {
    amount: number;
    type: 'percentage' | 'fixed';
  };
  startDate: string;
  endDate?: string;
  isOngoing?: boolean;
  daysAvailable?: string[];
  timeRestrictions?: {
    startTime?: string;
    endTime?: string;
  };
  termsAndConditions?: string;
  restrictions?: string[];
  notificationSettings?: {
    sendPushNotification: boolean;
    sendEmailNotification: boolean;
    targetAudience: 'all' | 'subscribers' | 'saved' | 'custom';
    customAudience?: string[];
    scheduledAt?: string;
  };
}

interface SpecialResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<SpecialResponse>> {
  try {
    const payload = await getPayload({ config });
    
    // Get the current user
    const { user } = await payload.auth({ headers: request.headers });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is a business owner
    if (!user.isBusinessOwner) {
      return NextResponse.json(
        { success: false, message: 'Business owner status required' },
        { status: 403 }
      );
    }

    const body: CreateSpecialRequest = await request.json();

    // Validate required fields
    if (!body.locationId || !body.title || !body.description || !body.startDate) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if location exists and user owns it
    const location = await payload.findByID({
      collection: 'locations',
      id: body.locationId,
    });

    if (!location) {
      return NextResponse.json(
        { success: false, message: 'Location not found' },
        { status: 404 }
      );
    }

    if (location.ownership?.ownerId !== user.id || location.ownership?.claimStatus !== 'approved') {
      return NextResponse.json(
        { success: false, message: 'You do not own this location' },
        { status: 403 }
      );
    }

    // Check if location allows specials
    if (!location.businessSettings?.allowSpecials) {
      return NextResponse.json(
        { success: false, message: 'This location does not allow specials' },
        { status: 403 }
      );
    }

    // Create the special
    const special = await payload.create({
      collection: 'specials',
      data: {
        title: body.title,
        slug: body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        description: body.description,
        shortDescription: body.shortDescription,
        specialType: body.specialType,
        discountValue: body.discountValue,
        startDate: body.startDate,
        endDate: body.endDate,
        isOngoing: body.isOngoing,
        daysAvailable: body.daysAvailable,
        timeRestrictions: body.timeRestrictions,
        termsAndConditions: body.termsAndConditions,
        restrictions: body.restrictions,
        location: body.locationId,
        businessOwner: user.id,
        createdBy: user.id,
        status: 'pending', // Requires admin approval
        notificationSettings: body.notificationSettings || {
          sendPushNotification: true,
          sendEmailNotification: false,
          targetAudience: 'all'
        },
        approvalHistory: [
          {
            action: 'submitted',
            timestamp: new Date().toISOString(),
            notes: 'Submitted by business owner'
          }
        ]
      }
    });

    // Create notification for admins
    try {
      const admins = await payload.find({
        collection: 'users',
        where: { role: { equals: 'admin' } },
        depth: 0
      });

      for (const admin of admins.docs) {
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: admin.id,
            type: 'special_review',
            title: 'New Special Requires Review',
            message: `${user.name} submitted a new special "${body.title}" for "${location.name}"`,
            priority: 'normal',
            relatedTo: {
              relationTo: 'specials',
              value: special.id
            },
            read: false,
          },
        });
      }
    } catch (error) {
      console.error('Error creating admin notifications:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Special created successfully and submitted for review',
      data: special
    });

  } catch (error) {
    console.error('Error creating special:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<SpecialResponse>> {
  try {
    const payload = await getPayload({ config });
    
    // Get the current user
    const { user } = await payload.auth({ headers: request.headers });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is a business owner
    if (!user.isBusinessOwner) {
      return NextResponse.json(
        { success: false, message: 'Business owner status required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const locationId = searchParams.get('locationId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build where clause
    const where: any = {
      businessOwner: { equals: user.id }
    };

    if (status) {
      where.status = { equals: status };
    }

    if (locationId) {
      where.location = { equals: locationId };
    }

    // Get specials
    const specials = await payload.find({
      collection: 'specials',
      where,
      sort: '-createdAt',
      page,
      limit,
      depth: 1
    });

    return NextResponse.json({
      success: true,
      message: 'Specials retrieved successfully',
      data: {
        specials: specials.docs,
        pagination: {
          page: specials.page,
          limit: specials.limit,
          total: specials.totalDocs,
          totalPages: specials.totalPages,
          hasNext: specials.hasNextPage,
          hasPrev: specials.hasPrevPage
        }
      }
    });

  } catch (error) {
    console.error('Error getting specials:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 