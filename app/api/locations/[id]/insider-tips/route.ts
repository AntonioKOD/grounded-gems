import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

interface SubmitTipRequest {
  category: 'timing' | 'food' | 'secrets' | 'protips' | 'access' | 'savings' | 'recommendations' | 'hidden'
  tip: string
  priority?: 'high' | 'medium' | 'low'
}

// POST /api/locations/[id]/insider-tips - Submit a new insider tip
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params
    const payload = await getPayload({ config })
    
    // Get user from auth
    const { user } = await payload.auth({ headers: req.headers })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body: SubmitTipRequest = await req.json()
    const { category, tip, priority = 'medium' } = body

    // Validation
    if (!category || !tip) {
      return NextResponse.json(
        { error: 'Category and tip are required' },
        { status: 400 }
      )
    }

    if (tip.trim().length < 10) {
      return NextResponse.json(
        { error: 'Tip must be at least 10 characters long' },
        { status: 400 }
      )
    }

    if (tip.trim().length > 200) {
      return NextResponse.json(
        { error: 'Tip must be less than 200 characters' },
        { status: 400 }
      )
    }

    const validCategories = ['timing', 'food', 'secrets', 'protips', 'access', 'savings', 'recommendations', 'hidden']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      )
    }

    const validPriorities = ['high', 'medium', 'low']
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority' },
        { status: 400 }
      )
    }

    // Check if location exists
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check for duplicate tips from the same user
    const existingTips = location.insiderTips || []
    const userTips = existingTips.filter((existingTip: any) => 
      existingTip.source === 'user_submitted' && 
      existingTip.tip?.toLowerCase().trim() === tip.toLowerCase().trim()
    )

    if (userTips.length > 0) {
      return NextResponse.json(
        { error: 'This tip has already been submitted' },
        { status: 400 }
      )
    }

    // Create the new tip
    const newTip = {
      category,
      tip: tip.trim(),
      priority,
      isVerified: false,
      source: 'user_submitted' as const,
      status: 'pending' as const,
      submittedBy: user.id,
      submittedAt: new Date().toISOString(),
    }

    // Add the tip to the location's insider tips
    const updatedTips = [...existingTips, newTip]

    // Update the location
    await payload.update({
      collection: 'locations',
      id: locationId,
      data: {
        insiderTips: updatedTips,
      },
    })

    // Create notification for location owner (if different from submitter)
    if (location.createdBy && location.createdBy !== user.id) {
      try {
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: typeof location.createdBy === 'string' ? location.createdBy : location.createdBy.id,
            type: 'tip_submission',
            title: 'New Insider Tip Submitted',
            message: `${user.name || 'Someone'} shared an insider tip for ${location.name}`,
            actionBy: user.id,
            priority: 'normal',
            relatedTo: {
              relationTo: 'locations',
              value: locationId,
            },
            metadata: {
              locationName: location.name,
              tipCategory: category,
              tipPreview: tip.substring(0, 50) + (tip.length > 50 ? '...' : ''),
            },
            read: false,
          },
        })
      } catch (error) {
        console.error('Error creating notification:', error)
      }
    }

    return NextResponse.json({
      success: true,
      tip: newTip,
      message: 'Insider tip submitted successfully! It will be reviewed before being published.',
    })

  } catch (error) {
    console.error('Error submitting insider tip:', error)
    return NextResponse.json(
      { error: 'Failed to submit insider tip' },
      { status: 500 }
    )
  }
}

// GET /api/locations/[id]/insider-tips - Get insider tips for a location
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params
    const payload = await getPayload({ config })

    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
      select: {
        insiderTips: true,
        name: true,
      },
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Filter and sort tips
    const tips = (Array.isArray(location.insiderTips) ? location.insiderTips : [])
      .filter((tip: any) => {
        // Only show approved tips or tips from non-user sources
        if (tip.source === 'user_submitted') {
          return tip.status === 'approved' && tip.tip && tip.tip.trim().length > 0
        }
        // Show AI, business, and staff tips
        return tip.tip && tip.tip.trim().length > 0
      })
      .sort((a: any, b: any) => {
        // Sort by priority (high -> medium -> low), then by submission date
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        const priorityDiff = priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
        if (priorityDiff !== 0) return priorityDiff
        
        // Then by verification status (verified first)
        if (a.isVerified && !b.isVerified) return -1
        if (!a.isVerified && b.isVerified) return 1
        
        // Then by submission date (newest first)
        const aDate = new Date(a.submittedAt || 0).getTime()
        const bDate = new Date(b.submittedAt || 0).getTime()
        return bDate - aDate
      })

    return NextResponse.json({
      success: true,
      tips,
      count: tips.length,
    })

  } catch (error) {
    console.error('Error fetching insider tips:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insider tips' },
      { status: 500 }
    )
  }
} 