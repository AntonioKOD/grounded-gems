import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/mobile/guides/[id]/reviews - List reviews for a guide
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await getPayload({ config })
    const { id } = params
    // Fetch reviews for the guide
    const result = await payload.find({
      collection: 'reviews',
      where: { guide: { equals: id } },
      sort: '-createdAt',
      limit: 20,
      depth: 1,
      populate: { author: { select: { id: true, name: true, profileImage: true } } }
    })
    const reviews = result.docs.map((review: any) => ({
      id: review.id,
      rating: review.rating,
      content: review.content,
      author: review.author ? {
        id: review.author.id,
        name: review.author.name,
        profileImage: review.author.profileImage?.url || null
      } : null,
      createdAt: review.createdAt
    }))
    return NextResponse.json({ success: true, reviews })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

// POST /api/mobile/guides/[id]/reviews - Add a review for a guide
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await getPayload({ config })
    const { id } = params
    const body = await request.json()
    const { rating, content } = body
    // TODO: Get user from auth
    // const { user } = await payload.auth({ headers: request.headers })
    // if (!user) { ... }
    if (!rating || !content) {
      return NextResponse.json({ success: false, error: 'Rating and content are required' }, { status: 400 })
    }
    // Placeholder: create review (replace with real logic)
    const review = await payload.create({
      collection: 'reviews',
      data: {
        guide: id,
        rating,
        content,
        // author: user.id, // Uncomment when auth is added
      }
    })
    return NextResponse.json({
      success: true,
      message: 'Review added successfully',
      review: {
        id: review.id,
        rating: review.rating,
        content: review.content,
        createdAt: review.createdAt
      }
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to add review' }, { status: 500 })
  }
} 