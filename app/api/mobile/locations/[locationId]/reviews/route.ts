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
    return NextResponse.json({ success: true, data: { reviews } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

// POST /api/mobile/locations/[locationId]/reviews - Add a review
export async function POST(request: NextRequest, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    const { locationId } = await params
    const user = await getServerSideUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    const body = await request.json()
    const { title, content, rating, visitDate, pros, cons, tips } = body
    if (!title || !content || !rating) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }
    // Save review (assume addReviewToLocation exists)
    const { addReviewToLocation } = await import('@/app/actions')
    const review = await addReviewToLocation(locationId, {
      title,
      content,
      rating,
      visitDate,
      pros,
      cons,
      tips,
      author: user.id
    })
    return NextResponse.json({ success: true, data: { review } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to add review' }, { status: 500 })
  }
} 