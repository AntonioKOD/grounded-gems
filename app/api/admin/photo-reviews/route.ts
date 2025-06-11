import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/admin/photo-reviews - Get photos pending review
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'pending'
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const locationId = searchParams.get('locationId')

    const payload = await getPayload({ config })

    // Check admin permissions (you may need to adjust this based on your auth setup)
    // This is a basic check - implement proper admin authentication
    // const currentUser = await payload.auth({ req })
    // if (!currentUser || currentUser.collection !== 'users' || !currentUser.role?.includes('admin')) {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    // }

    // Build query
    const where: any = {
      status: {
        equals: status
      }
    }

    if (locationId) {
      where.location = {
        equals: locationId
      }
    }

    const photoSubmissions = await payload.find({
      collection: 'locationPhotoSubmissions',
      where,
      limit,
      page,
      sort: '-submittedAt',
      depth: 2
    })

    return NextResponse.json({
      success: true,
      submissions: photoSubmissions.docs,
      pagination: {
        page: photoSubmissions.page,
        totalPages: photoSubmissions.totalPages,
        totalDocs: photoSubmissions.totalDocs,
        hasNextPage: photoSubmissions.hasNextPage,
        hasPrevPage: photoSubmissions.hasPrevPage
      }
    })

  } catch (error) {
    console.error('Error fetching photo reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch photo reviews' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/photo-reviews - Update photo review status
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { submissionId, status, reviewNotes, qualityScore } = body

    if (!submissionId || !status) {
      return NextResponse.json(
        { error: 'Submission ID and status are required' },
        { status: 400 }
      )
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Check admin permissions
    // const currentUser = await payload.auth({ req })
    // if (!currentUser || currentUser.collection !== 'users' || !currentUser.role?.includes('admin')) {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    // }

    // Update the photo submission
    const updatedSubmission = await payload.update({
      collection: 'locationPhotoSubmissions',
      id: submissionId,
      data: {
        status,
        reviewNotes: reviewNotes || undefined,
        qualityScore: qualityScore || undefined,
        reviewedAt: new Date().toISOString(),
        approvedAt: status === 'approved' ? new Date().toISOString() : undefined,
        // reviewedBy: currentUser.id
      }
    })

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      message: `Photo ${status} successfully`
    })

  } catch (error) {
    console.error('Error updating photo review:', error)
    return NextResponse.json(
      { error: 'Failed to update photo review' },
      { status: 500 }
    )
  }
} 