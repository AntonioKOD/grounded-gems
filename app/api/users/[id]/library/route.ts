import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/users/[id]/library - Get user's purchased guides
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { id: userId } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const sort = searchParams.get('sort') || '-purchaseDate'
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      )
    }
    
    // Fetch user's completed purchases with guide details
    const purchases = await payload.find({
      collection: 'guide-purchases',
      where: {
        and: [
          { user: { equals: userId } },
          { status: { equals: 'completed' } }
        ]
      },
      populate: [
        'guide',
        'guide.creator',
        'guide.creator.profileImage',
        'guide.primaryLocation',
        'guide.featuredImage'
      ],
      sort,
      page,
      limit
    })
    
    // Transform the data to include purchase metadata
    const libraryItems = purchases.docs.map(purchase => {
      const guide = purchase.guide as any
      return {
        purchase: {
          id: purchase.id,
          purchaseDate: purchase.purchaseDate,
          amount: purchase.amount,
          paymentMethod: purchase.paymentMethod,
          downloadCount: purchase.downloadCount || 0,
          lastAccessedAt: purchase.lastAccessedAt,
          hasReviewed: purchase.hasReviewed || false,
          purchaseRating: purchase.purchaseRating
        },
        guide: {
          id: guide.id,
          title: guide.title,
          slug: guide.slug,
          description: guide.description,
          creator: {
            id: guide.creator?.id,
            name: guide.creator?.name,
            username: guide.creator?.username,
            profileImage: guide.creator?.profileImage
          },
          primaryLocation: guide.primaryLocation,
          category: guide.category,
          difficulty: guide.difficulty,
          duration: guide.duration,
          pricing: guide.pricing,
          featuredImage: guide.featuredImage,
          stats: guide.stats,
          tags: guide.tags
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      library: libraryItems,
      pagination: {
        page: purchases.page,
        totalPages: purchases.totalPages,
        totalDocs: purchases.totalDocs,
        hasNextPage: purchases.hasNextPage,
        hasPrevPage: purchases.hasPrevPage
      }
    })
    
  } catch (error) {
    console.error('Error fetching user library:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch library' },
      { status: 500 }
    )
  }
}

// PATCH /api/users/[id]/library - Update access tracking for a guide
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { id: userId } = await params
    const { guideId, action } = await request.json()
    
    if (!userId || !guideId) {
      return NextResponse.json(
        { success: false, error: 'User ID and Guide ID required' },
        { status: 400 }
      )
    }
    
    // Find the purchase record
    const purchase = await payload.find({
      collection: 'guide-purchases',
      where: {
        and: [
          { user: { equals: userId } },
          { guide: { equals: guideId } },
          { status: { equals: 'completed' } }
        ]
      },
      limit: 1
    })
    
    if (purchase.docs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Purchase not found' },
        { status: 404 }
      )
    }
    
    const purchaseRecord = purchase.docs[0]
    
    // Update based on action
    let updateData: any = {}
    
    if (action === 'access') {
      updateData = {
        downloadCount: (purchaseRecord.downloadCount || 0) + 1,
        lastAccessedAt: new Date()
      }
    } else if (action === 'review') {
      updateData = {
        hasReviewed: true
      }
    }
    
    // Update the purchase record
    const updatedPurchase = await payload.update({
      collection: 'guide-purchases',
      id: purchaseRecord.id,
      data: updateData
    })
    
    return NextResponse.json({
      success: true,
      purchase: updatedPurchase
    })
    
  } catch (error) {
    console.error('Error updating library access:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update access' },
      { status: 500 }
    )
  }
} 