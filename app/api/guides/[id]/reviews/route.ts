import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/guides/[id]/reviews - Get reviews for a guide
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config })
    const { id: guideId } = params
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sort = searchParams.get('sort') || '-createdAt'
    
    // Get reviews for this guide
    const result = await payload.find({
      collection: 'guide-reviews',
      where: {
        and: [
          { guide: { equals: guideId } },
          { status: { equals: 'approved' } }
        ]
      },
      page,
      limit,
      sort,
      populate: ['user']
    })
    
    return NextResponse.json({
      success: true,
      reviews: result.docs,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        totalDocs: result.totalDocs,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      }
    })
    
  } catch (error) {
    console.error('Error fetching guide reviews:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// POST /api/guides/[id]/reviews - Create a review for a guide
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config })
    const { id: guideId } = params
    const data = await request.json()
    
    // TODO: Add authentication to get current user
    const { userId } = data
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      )
    }
    
    // Check if user has already reviewed this guide
    const existingReview = await payload.find({
      collection: 'guide-reviews',
      where: {
        and: [
          { user: { equals: userId } },
          { guide: { equals: guideId } }
        ]
      },
      limit: 1
    })
    
    if (existingReview.docs.length > 0) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this guide' },
        { status: 400 }
      )
    }
    
    // Create the review
    const review = await payload.create({
      collection: 'guide-reviews',
      data: {
        ...data,
        user: userId,
        guide: guideId,
        status: 'pending' // Reviews need approval
      }
    })
    
    return NextResponse.json({
      success: true,
      review,
      message: 'Review submitted successfully! It will be published after moderation.'
    })
    
  } catch (error) {
    console.error('Error creating guide review:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create review' },
      { status: 500 }
    )
  }
} 