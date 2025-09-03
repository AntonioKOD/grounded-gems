import { NextRequest, NextResponse } from 'next/server';
import { getPayloadHMR } from '@payloadcms/next/utilities';
import config from '@payload-config';

// GET /api/reviews - Fetch reviews for a location
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    const payload = await getPayloadHMR({ config });
    
    const reviews = await payload.find({
      collection: 'reviews',
      where: {
        and: [
          { location: { equals: locationId } },
          { status: { equals: 'published' } }
        ]
      },
      limit,
      page,
      sort: '-createdAt',
      populate: {
        author: {
          select: {
            name: true,
            profileImage: true
          }
        }
      }
    });
    const numReviews = await payload.find({
      collection: 'reviews',
      where: {
        location: { equals: locationId }
      }
    });

    const averageRating = numReviews.docs.reduce((sum: number, review: any) => sum + review.rating, 0) / numReviews.docs.length;

    const totalReviews = numReviews.docs.length;

    return NextResponse.json({
      success: true,
      reviews: reviews.docs,
      totalPages: reviews.totalPages,
      page: reviews.page,
      totalDocs: reviews.totalDocs,
      averageRating,
      totalReviews
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Create a new review
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      content,
      rating,
      locationId,
      visitDate,
      pros = [],
      cons = [],
      tips,
      authorId,
      categoryRatings = []
    } = body;

    // Validation
    if (!title || !content || !rating || !locationId || !authorId) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, rating, locationId, authorId' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const payload = await getPayloadHMR({ config });

    // Verify location exists
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Verify user exists
    const user = await payload.findByID({
      collection: 'users',
      id: authorId
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create review
    const review = await payload.create({
      collection: 'reviews',
      data: {
        title,
        content,
        rating,
        reviewType: 'location',
        location: locationId,
        author: authorId,
        visitDate: visitDate || new Date().toISOString(),
        pros: pros.map((pro: string) => ({ pro })),
        cons: cons.map((con: string) => ({ con })),
        tips,
        categoryRatings: categoryRatings.map((cr: any) => ({
          category: cr.category,
          rating: cr.rating
        })),
        status: 'published', // Auto-publish for now, can add moderation later
        helpfulCount: 0,
        unhelpfulCount: 0,
        reportCount: 0
      }
    });

    // Notify location creator about the new review (if not the same user)
    if (locationId && authorId !== locationId) {
      try {
        const location = await payload.findByID({
          collection: 'locations',
          id: locationId,
        });

        if (location && location.createdBy && location.createdBy !== authorId) {
          const creatorId = typeof location.createdBy === 'string' 
            ? location.createdBy 
            : location.createdBy?.id;

          if (creatorId) {
            // Use notification hooks for automatic push notifications
            const { notificationHooks } = await import('@/lib/notification-hooks');
            await notificationHooks.onNewReview(
              creatorId,
              authorId,
              user.name || 'Someone',
              locationId,
              location.name,
              rating,
              content
            );
            
            console.log('✅ [Reviews API] Review notification sent via hooks');
          }
        }
      } catch (notificationError) {
        console.warn('Failed to send review notification:', notificationError);
        // Don't fail the review creation if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      review,
      message: 'Review created successfully'
    });

  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
} 