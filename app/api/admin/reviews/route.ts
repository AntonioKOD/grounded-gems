import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/admin/reviews - Get all reviews for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const status = searchParams.get('status') // pending, published, rejected
    const reviewType = searchParams.get('reviewType') // location, event, special
    
    // Build where clause
    const where: any = {}
    
    if (status && status !== 'all') {
      where.status = { equals: status }
    }
    
    if (reviewType && reviewType !== 'all') {
      where.reviewType = { equals: reviewType }
    }
    
    // Get reviews with populated relationships
    const result = await payload.find({
      collection: 'reviews',
      where,
      page,
      limit,
      sort: '-createdAt',
      populate: {
        author: {},
        location: {},
        event: {},
        special: {}
      }
    })
    
    // Get summary statistics
    const stats = await Promise.all([
      payload.find({
        collection: 'reviews',
        where: { status: { equals: 'pending' } },
        limit: 0
      }),
      payload.find({
        collection: 'reviews',
        where: { status: { equals: 'published' } },
        limit: 0
      }),
      payload.find({
        collection: 'reviews',
        where: { status: { equals: 'rejected' } },
        limit: 0
      }),
      payload.find({
        collection: 'reviews',
        limit: 0
      })
    ])
    
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
      },
      stats: {
        pending: stats[0].totalDocs,
        published: stats[1].totalDocs,
        rejected: stats[2].totalDocs,
        total: stats[3].totalDocs,
      }
    })
    
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/reviews - Bulk update review status
export async function PUT(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { reviewIds, status, moderationNotes } = await request.json()
    
    if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Review IDs are required' },
        { status: 400 }
      )
    }
    
    if (!['pending', 'published', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      )
    }
    
    // Update reviews
    const updatedReviews = await Promise.all(
      reviewIds.map(async (id: string) => {
        return await payload.update({
          collection: 'reviews',
          id,
          data: {
            status,
            ...(moderationNotes && { moderationNotes })
          }
        })
      })
    )
    
    return NextResponse.json({
      success: true,
      message: `${updatedReviews.length} reviews updated successfully`,
      updatedReviews
    })
    
  } catch (error) {
    console.error('Error updating reviews:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update reviews' },
      { status: 500 }
    )
  }
} 