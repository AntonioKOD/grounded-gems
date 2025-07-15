import { NextRequest, NextResponse } from "next/server"
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isAdminOrCreatedBy } from '@/access/isAdminOrCreatedBy'

// GET /api/admin/insider-tips/pending - Get all locations with pending insider tips
export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Check admin access
    const { user } = await payload.auth({ headers: req.headers })
    if (!user || !isAdminOrCreatedBy({ req: { user } } as any)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find all locations that have user-submitted insider tips
    const locations = await payload.find({
      collection: 'locations',
      where: {
        'insiderTips.source': {
          equals: 'user_submitted'
        }
      },
      depth: 2, // Include user details for submittedBy
      limit: 1000
    })

    // Process locations to include only relevant tips and user info
    const processedLocations = locations.docs
      .filter(location => location.insiderTips && Array.isArray(location.insiderTips))
      .map(location => {
        const pendingTips = (location.insiderTips || [])
          .filter((tip: any) => tip.source === 'user_submitted' && (!tip.status || tip.status === 'pending'))
          .map((tip: any, index: number) => ({
            id: `${location.id}-tip-${index}`, // Generate unique ID for admin interface
            category: tip.category,
            tip: tip.tip,
            priority: tip.priority,
            source: tip.source,
            status: tip.status || 'pending',
            submittedBy: tip.submittedBy,
            submittedAt: tip.submittedAt,
            reviewedBy: tip.reviewedBy,
            reviewedAt: tip.reviewedAt,
            rejectionReason: tip.rejectionReason,
            location: {
              id: location.id,
              name: location.name,
              slug: location.slug
            }
          }))

        return {
          id: location.id,
          name: location.name,
          slug: location.slug,
          insiderTips: pendingTips
        }
      })
      .filter(location => location.insiderTips.length > 0) // Only include locations with pending tips

    return NextResponse.json({
      success: true,
      locations: processedLocations,
      total: processedLocations.length
    })

  } catch (error) {
    console.error('Error fetching pending insider tips:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending insider tips' },
      { status: 500 }
    )
  }
} 