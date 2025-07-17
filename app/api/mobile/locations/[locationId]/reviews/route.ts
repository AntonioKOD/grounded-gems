import { NextRequest, NextResponse } from 'next/server'
import { getServerSideUser } from '@/lib/auth-server'
import { getReviewsbyId } from '@/app/actions'

// GET /api/mobile/locations/[locationId]/reviews - List reviews for a location
export async function GET(request: NextRequest, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    const { locationId } = await params
    const reviewsResult = await getReviewsbyId(locationId)
    const reviews = reviewsResult.docs.map((review: any) => ({
      id: review.id,
      title: review.title,
      content: review.content,
      rating: review.rating,
      author: {
        id: review.author?.id,
        name: review.author?.name || 'Anonymous',
        avatar: review.author?.profileImage?.url
      },
      visitDate: review.visitDate,
      pros: review.pros || [],
      cons: review.cons || [],
      tips: review.tips,
      isVerifiedVisit: review.isVerifiedVisit || false,
      helpfulCount: review.helpfulCount || 0,
      createdAt: review.createdAt
    }))
    const numReviews = reviews.length;
    const averageRating = reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / numReviews;

    return NextResponse.json({ success: true, data: { reviews, numReviews, averageRating } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

// POST /api/mobile/locations/[locationId]/reviews - Add a review
export async function POST(request: NextRequest, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    console.log('[REVIEWS] POST called');
    const { locationId } = await params;
    console.log('[REVIEWS] locationId:', locationId);

    // Get current user
    let user;
    try {
      user = await getServerSideUser();
      console.log('[REVIEWS] user:', user);
    } catch (userError) {
      console.error('[REVIEWS] Error in getServerSideUser:', userError);
      return NextResponse.json({ error: 'User auth error', details: userError instanceof Error ? userError.message : userError }, { status: 500 });
    }

    if (!user) {
      console.warn('[REVIEWS] No user found');
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('[REVIEWS] request body:', body);
    } catch (bodyError) {
      console.error('[REVIEWS] Error parsing request body:', bodyError);
      return NextResponse.json({ error: 'Invalid request body', details: bodyError instanceof Error ? bodyError.message : bodyError }, { status: 400 });
    }

    const { title, content, rating, visitDate, pros, cons, tips } = body
    if (!title || !content || !rating) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }
    // Create a new review in the reviews collection
    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    const payload = await getPayload({ config })
    const reviewData = {
      title,
      content,
      rating,
      visitDate,
      pros,
      cons,
      tips,
      reviewType: body.reviewType,
      location: locationId,
      author: user.id,
      status: 'published'
    }
    console.log('[REVIEWS] reviewData to create:', reviewData)
    const review = await payload.create({
      collection: 'reviews',
      data: reviewData
    })
    console.log('[REVIEWS] Created review:', review)

    // No need to manually update location stats here; handled by hooks

    return NextResponse.json({ success: true, data: { review } })
  } catch (error) {
    console.error('[REVIEWS] Error in POST:', error);
    return NextResponse.json({ error: 'Failed to add review', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 