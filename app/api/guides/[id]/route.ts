import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/guides/[id] - Get a specific guide
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config })
    const { id } = params
    
    // Get the guide with all related data
    const guide = await payload.findByID({
      collection: 'guides',
      id,
      populate: [
        'creator',
        'location',
        'featuredImage',
        'gallery.image'
      ]
    })
    
    // Check if guide is published (unless user is the creator or admin)
    if (guide.status !== 'published') {
      // TODO: Add authentication check to allow creators to see their own drafts
      return NextResponse.json(
        { success: false, error: 'Guide not found or not published' },
        { status: 404 }
      )
    }
    
    // Increment view count
    await payload.update({
      collection: 'guides',
      id,
      data: {
        'stats.views': (guide.stats?.views || 0) + 1
      }
    })
    
    return NextResponse.json({
      success: true,
      guide
    })
    
  } catch (error) {
    console.error('Error fetching guide:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch guide' },
      { status: 500 }
    )
  }
}

// PUT /api/guides/[id] - Update a guide
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config })
    const { id } = params
    const data = await request.json()
    
    // TODO: Add authentication check to ensure user can update this guide
    
    const guide = await payload.update({
      collection: 'guides',
      id,
      data
    })
    
    return NextResponse.json({
      success: true,
      guide
    })
    
  } catch (error) {
    console.error('Error updating guide:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update guide' },
      { status: 500 }
    )
  }
}

// DELETE /api/guides/[id] - Delete a guide
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config })
    const { id } = params
    
    // TODO: Add authentication check to ensure user can delete this guide
    
    await payload.delete({
      collection: 'guides',
      id
    })
    
    return NextResponse.json({
      success: true,
      message: 'Guide deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting guide:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete guide' },
      { status: 500 }
    )
  }
} 