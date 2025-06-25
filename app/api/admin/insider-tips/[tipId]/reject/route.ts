import { NextRequest, NextResponse } from "next/server"
import { getPayload } from 'payload'
import config from '@/payload.config'
import { isAdminOrCreatedBy } from '@/access/isAdminOrCreatedBy'

// POST /api/admin/insider-tips/[tipId]/reject - Reject an insider tip
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tipId: string }> }
) {
  try {
    const { tipId } = await params
    const body = await req.json()
    const { reason } = body

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })
    
    // Check admin access
    const { user } = await payload.auth({ headers: req.headers })
    if (!user || !isAdminOrCreatedBy({ req: { user } })) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse tipId to get location ID and tip index
    const [locationId, , tipIndexStr] = tipId.split('-')
    const tipIndex = parseInt(tipIndexStr)

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
      status: 'rejected',
      rejectionReason: reason.trim(),
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
            type: 'tip_rejected',
            title: 'Insider Tip Update',
            message: `Your insider tip for ${location.name} was not approved. Reason: ${reason.trim()}`,
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
              rejectionReason: reason.trim(),
            },
            read: false,
          },
        })
      } catch (error) {
        console.error('Error creating rejection notification:', error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tip rejected successfully',
      tip: updatedTips[tipIndex]
    })

  } catch (error) {
    console.error('Error rejecting insider tip:', error)
    return NextResponse.json(
      { error: 'Failed to reject insider tip' },
      { status: 500 }
    )
  }
} 