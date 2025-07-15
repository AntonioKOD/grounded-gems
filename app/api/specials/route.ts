import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const body = await req.json();
    
    const {
      title,
      description,
      shortDescription,
      locationId,
      specialType,
      discountValue,
      startDate,
      endDate,
      isOngoing,
      daysAvailable,
      timeRestrictions,
      terms,
      restrictions,
    } = body;

    console.log('Creating special:', { title, specialType, locationId });

    // Get user from session/auth
    const { user } = await payload.auth({ headers: req.headers });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Ensure user.id exists and is a string
    const userId = typeof user.id === 'string' ? user.id : String(user.id);
    
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.error('Invalid user ID from auth:', user);
      return NextResponse.json(
        { error: 'Invalid user authentication data' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!title || !description || !locationId || !specialType || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, locationId, specialType, startDate' },
        { status: 400 }
      );
    }

    // Validate location exists and user owns it
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Check if user owns this location
    const locationOwnerId = typeof location.createdBy === 'string' 
      ? location.createdBy 
      : location.createdBy?.id;

    if (locationOwnerId !== userId) {
      return NextResponse.json(
        { error: 'You can only create specials for your own locations' },
        { status: 403 }
      );
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    // Prepare special data
    const specialData = {
      title,
      slug: `${slug}-${Date.now()}`, // Add timestamp to ensure uniqueness
      description,
      shortDescription,
      location: locationId,
      specialType,
      discountValue,
      startDate,
      endDate: isOngoing ? null : endDate,
      isOngoing,
      daysAvailable,
      timeRestrictions,
      termsAndConditions: terms,
      restrictions,
      createdBy: userId,
      status: 'published', // Auto-publish for location owners
      isFeatured: false,
      isVerified: false,
      redemptionCount: 0,
      saveCount: 0,
    };

    console.log('Creating special with data:', specialData);

    // Create the special
    const special = await payload.create({
      collection: 'specials',
      data: specialData,
    });

    console.log('Special created successfully:', special.id);

    return NextResponse.json({
      success: true,
      special,
      message: 'Special created successfully and is now live!',
    });

  } catch (error) {
    console.error('Error creating special:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'No message',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      data: error instanceof Error && 'data' in error ? (error as any).data : 'No additional data'
    });
    return NextResponse.json(
      { error: 'Failed to create special' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const { searchParams } = new URL(req.url);
    
    const locationId = searchParams.get('locationId');
    const status = searchParams.get('status') || 'published';
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query conditions
    const whereConditions: any = {
      status: { equals: status },
    };
    
    if (locationId) {
      whereConditions.location = { equals: locationId };
    }

    // Add date filter to only show active specials
    const now = new Date().toISOString();
    whereConditions.and = [
      {
        startDate: { less_than_equal: now },
      },
      {
        or: [
          { isOngoing: { equals: true } },
          { endDate: { greater_than: now } },
        ],
      },
    ];

    const specials = await payload.find({
      collection: 'specials',
      where: whereConditions,
      limit,
      sort: '-createdAt',
      depth: 2,
    });

    return NextResponse.json({
      success: true,
      specials: specials.docs,
      total: specials.totalDocs,
      pagination: {
        totalDocs: specials.totalDocs,
        totalPages: specials.totalPages,
        page: specials.page,
        limit: specials.limit,
        hasNextPage: specials.hasNextPage,
        hasPrevPage: specials.hasPrevPage,
      },
    });

  } catch (error) {
    console.error('Error fetching specials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch specials' },
      { status: 500 }
    );
  }
} 