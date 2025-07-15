import { NextRequest, NextResponse } from "next/server"
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isAdminOrCreatedBy } from '@/access/isAdminOrCreatedBy'

// POST /api/admin/insider-tips/[tipId]/approve - Approve an insider tip
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tipId: string }> }
) {
  try {
    const { tipId } = await params
    const payload = await getPayload({ config })
    
    // Check admin access
    const { user } = await payload.auth({ headers: req.headers })
    // Construct a minimal mock PayloadRequest for access check
    if (!user || !isAdminOrCreatedBy({ req: { user } } as any)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse tipId to get location ID and tip index
    const [locationId, , tipIndexStr] = tipId.split('-')
    const tipIndex = parseInt(tipIndexStr || '')

    if (!locationId || isNaN(tipIndex)) {
      return NextResponse.json(
        { error: 'Invalid tip ID' },
        { status: 400 }
      )
    }

    // Get the location
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

    // Check if tip exists and is user-submitted
    const insiderTips = location.insiderTips || []
    if (!insiderTips[tipIndex] || insiderTips[tipIndex].source !== 'user_submitted') {
      return NextResponse.json(
        { error: 'Tip not found or not user-submitted' },
        { status: 404 }
      )
    }

    // Update the tip status
    const updatedTips = [...insiderTips]
    updatedTips[tipIndex] = {
      ...updatedTips[tipIndex],
      status: 'approved',
      reviewedBy: user.id,
      reviewedAt: new Date().toISOString(),
    }

    // Update the location
    await payload.update({
      collection: 'locations',
      id: locationId,
      data: {
        insiderTips: updatedTips,
      },
    })

    // Create notification for the tip submitter
    const tip = updatedTips[tipIndex]
    if (tip.submittedBy && tip.submittedBy !== user.id) {
      try {
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: typeof tip.submittedBy === 'string' ? tip.submittedBy : tip.submittedBy.id,
            type: 'tip_approved',
            title: 'Your Insider Tip Was Approved!',
            message: `Your insider tip for ${location.name} has been approved and is now live.`,
            actionBy: user.id,
            priority: 'normal',
            relatedTo: {
              relationTo: 'locations',
              value: locationId,
            },
            metadata: {
              locationName: location.name,
              tipCategory: tip.category,
              tipPreview: tip.tip.substring(0, 50) + (tip.tip.length > 50 ? '...' : ''),
            },
            read: false,
          },
        })
      } catch (error) {
        console.error('Error creating approval notification:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tip approved successfully',
      tip: updatedTips[tipIndex]
    })

  } catch (error) {
    console.error('Error approving insider tip:', error)
    return NextResponse.json(
      { error: 'Failed to approve insider tip' },
      { status: 500 }
    )
  }
} 