import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/guides/slug/[slug] - Get a specific guide by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { slug } = await params
    
    console.log('🔍 Looking for guide with slug:', slug)
    
    // Find the guide by slug
    const result = await payload.find({
      collection: 'guides',
      where: {
        slug: { equals: slug }
      },
      populate: [
        'creator',
        'creator.profileImage',
        'primaryLocation',
        'locations.location',
        'featuredImage'
      ],
      limit: 1
    })
    
    if (result.docs.length === 0) {
      console.log('❌ Guide not found with slug:', slug)
      return NextResponse.json(
        { success: false, error: 'Guide not found' },
        { status: 404 }
      )
    }
    
    const guide = result.docs[0]
    console.log('✅ Found guide:', guide.title, 'Status:', guide.status)
    
    // Check if guide is published (unless user is the creator or admin)
    if (guide.status !== 'published') {
      // TODO: Add authentication check to allow creators to see their own drafts
      console.log('❌ Guide not published:', guide.status)
      return NextResponse.json(
        { success: false, error: 'Guide not found or not published' },
        { status: 404 }
      )
    }
    
    // Increment view count
    try {
      const currentGuide = await payload.findByID({
        collection: 'guides',
        id: guide.id
      })
      
      if (currentGuide) {
        const currentStats = currentGuide.stats || {}
        
        // Retry mechanism for write conflicts
        let retries = 3
        while (retries > 0) {
          try {
            await payload.update({
              collection: 'guides',
              id: guide.id,
              data: {
                stats: {
                  ...currentStats,
                  views: (currentStats.views || 0) + 1
                }
              }
            })
            console.log('📈 Incremented view count for guide:', guide.title)
            break // Success, exit retry loop
          } catch (updateError: any) {
            retries--
            if (updateError.code === 112 && retries > 0) { // WriteConflict error
              console.log(`🔄 Write conflict, retrying... (${retries} attempts left)`)
              await new Promise(resolve => setTimeout(resolve, 100)) // Small delay
              // Refresh the guide data for retry
              const refreshedGuide = await payload.findByID({
                collection: 'guides',
                id: guide.id
              })
              if (refreshedGuide) {
                currentStats.views = refreshedGuide.stats?.views || 0
              }
            } else {
              throw updateError // Re-throw if not a write conflict or no retries left
            }
          }
        }
      }
    } catch (viewError) {
      console.error('Error incrementing view count:', viewError)
      // Don't fail the request if view count update fails
    }
    
    return NextResponse.json({
      success: true,
      guide
    })
    
  } catch (error) {
    console.error('Error fetching guide by slug:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch guide' },
      { status: 500 }
    )
  }
} 