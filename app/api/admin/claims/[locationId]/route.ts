import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '../../../../../payload.config'

export async function GET(
  request: NextRequest,
  { params }: { params: { locationId: string } }
) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })

    // Check if user is admin
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const location = await payload.findByID({
      collection: 'locations',
      id: params.locationId,
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      location: {
        id: location.id,
        name: location.name,
        slug: location.slug,
        description: location.description,
        address: location.address,
        ownership: location.ownership,
        categories: location.categories,
        featuredImage: location.featuredImage,
        gallery: location.gallery,
        contactInfo: location.contactInfo,
        businessHours: location.businessHours,
        priceRange: location.priceRange,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt
      }
    })

  } catch (error) {
    console.error('Error fetching claim details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch claim details' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { locationId: string } }
) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })

    // Check if user is admin
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { action, reason } = await request.json()

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    const location = await payload.findByID({
      collection: 'locations',
      id: params.locationId,
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    if (!location.ownership || location.ownership.claimStatus !== 'pending') {
      return NextResponse.json(
        { error: 'No pending claim found for this location' },
        { status: 400 }
      )
    }

    // Update claim status
    const updatedLocation = await payload.update({
      collection: 'locations',
      id: params.locationId,
      data: {
        ownership: {
          ...location.ownership,
          claimStatus: action === 'approve' ? 'approved' : 'rejected',
          reviewedAt: new Date().toISOString(),
          reviewedBy: user.id,
          reviewReason: reason || null
        }
      }
    })

    // Send notification email to claimant
    if (location.ownership.claimEmail) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/api/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: location.ownership.claimEmail,
            subject: `Business Claim ${action === 'approve' ? 'Approved' : 'Rejected'}: ${location.name}`,
            template: 'claim-decision-notification',
            data: {
              locationName: location.name,
              locationUrl: `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/locations/${location.slug || location.id}`,
              action: action,
              reason: reason,
              adminName: user.name || 'Admin'
            }
          })
        })
      } catch (emailError) {
        console.error('Failed to send decision email:', emailError)
        // Don't fail the approval if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Claim ${action}d successfully`,
      location: {
        id: updatedLocation.id,
        name: updatedLocation.name,
        ownership: updatedLocation.ownership
      }
    })

  } catch (error) {
    console.error('Error processing claim decision:', error)
    return NextResponse.json(
      { error: 'Failed to process claim decision' },
      { status: 500 }
    )
  }
}









