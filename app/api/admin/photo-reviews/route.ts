import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/admin/photo-reviews - Fetch all photo submissions for admin review
export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get user from session/auth
    const { user } = await payload.auth({ headers: req.headers })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // For now, allow any authenticated user to review (you can add role check later)
    // if (user.role !== 'admin' && user.role !== 'moderator') {
    //   return NextResponse.json(
    //     { error: 'Admin or moderator access required' },
    //     { status: 403 }
    //   )
    // }

    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    // Build query conditions
    const where: any = {}
    if (status && status !== 'all') {
      where.status = { equals: status }
    }

    // Fetch photo submissions with populated relationships
    const submissions = await payload.find({
      collection: 'locationPhotoSubmissions',
      where,
      limit,
      page,
      sort: '-submittedAt', // Most recent first
      populate: {
        location: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          }
        },
        photo: {
          select: {
            id: true,
            url: true,
            alt: true,
            filename: true,
            width: true,
            height: true,
          }
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // Transform the data for the frontend
    const transformedSubmissions = submissions.docs.map(submission => ({
      id: submission.id,
      location: {
        id: submission.location.id,
        name: submission.location.name,
        slug: submission.location.slug,
      },
      submittedBy: {
        id: submission.submittedBy.id,
        name: submission.submittedBy.name,
        email: submission.submittedBy.email,
        username: submission.submittedBy.username,
      },
      photo: {
        id: submission.photo.id,
        url: submission.photo.url,
        alt: submission.photo.alt,
        filename: submission.photo.filename,
        width: submission.photo.width,
        height: submission.photo.height,
      },
      caption: submission.caption,
      category: submission.category,
      status: submission.status,
      qualityScore: submission.qualityScore,
      autoQualityChecks: submission.autoQualityChecks,
      submittedAt: submission.submittedAt,
      reviewedBy: submission.reviewedBy ? {
        id: submission.reviewedBy.id,
        name: submission.reviewedBy.name,
        email: submission.reviewedBy.email,
      } : null,
      reviewedAt: submission.reviewedAt,
      reviewNotes: submission.reviewNotes,
      rejectionReason: submission.rejectionReason,
      rejectionFeedback: submission.rejectionFeedback,
      featured: submission.featured,
      tags: submission.tags,
      visibility: submission.visibility,
    }))

    // Get summary statistics
    const statusCounts = await Promise.all([
      payload.count({ collection: 'locationPhotoSubmissions', where: { status: { equals: 'pending' } } }),
      payload.count({ collection: 'locationPhotoSubmissions', where: { status: { equals: 'reviewing' } } }),
      payload.count({ collection: 'locationPhotoSubmissions', where: { status: { equals: 'approved' } } }),
      payload.count({ collection: 'locationPhotoSubmissions', where: { status: { equals: 'rejected' } } }),
      payload.count({ collection: 'locationPhotoSubmissions', where: { status: { equals: 'needs_improvement' } } }),
    ])

    const summary = {
      total: submissions.totalDocs,
      pending: statusCounts[0].totalDocs,
      reviewing: statusCounts[1].totalDocs,
      approved: statusCounts[2].totalDocs,
      rejected: statusCounts[3].totalDocs,
      needs_improvement: statusCounts[4].totalDocs,
    }

    return NextResponse.json({
      success: true,
      submissions: transformedSubmissions,
      pagination: {
        totalDocs: submissions.totalDocs,
        totalPages: submissions.totalPages,
        page: submissions.page,
        limit: submissions.limit,
        hasNextPage: submissions.hasNextPage,
        hasPrevPage: submissions.hasPrevPage,
      },
      summary,
    })

  } catch (error) {
    console.error('Error fetching photo submissions for review:', error)
    return NextResponse.json(
      { error: 'Failed to fetch photo submissions' },
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