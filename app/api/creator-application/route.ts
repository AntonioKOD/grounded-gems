import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// POST /api/creator-application - Submit a creator application
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Use Payload's built-in authentication
    const authResult = await payload.auth({ headers: request.headers })
    
    if (!authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const { 
      motivation, 
      experienceLevel, 
      localAreas, 
      specialties, 
      portfolioDescription, 
      socialMedia 
    } = data

    const userId = authResult.user.id

    // Check if user already has a pending application
    const existingApplication = await payload.find({
      collection: 'creatorApplications',
      where: {
        and: [
          { applicant: { equals: userId } },
          { status: { in: ['pending', 'reviewing'] } }
        ]
      },
      limit: 1,
    })

    if (existingApplication.docs.length > 0) {
      return NextResponse.json(
        { success: false, error: 'You already have a pending application' },
        { status: 400 }
      )
    }

    // Create the application (the beforeChange hook will populate applicant info)
    const application = await payload.create({
      collection: 'creatorApplications',
      data: {
        motivation,
        experienceLevel,
        localAreas,
        specialties,
        portfolioDescription,
        socialMedia,
        status: 'pending',
      },
      user: authResult.user // Pass user context for hooks
    })

    // Update user's application status - get current user first to preserve other data
    const currentUser = await payload.findByID({
      collection: 'users',
      id: userId
    })

    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        creatorProfile: {
          ...currentUser.creatorProfile,
          applicationStatus: 'pending'
        }
      }
    })

    // Create notification for admins
    const admins = await payload.find({
      collection: 'users',
      where: {
        role: { equals: 'admin' }
      }
    })

    for (const admin of admins.docs) {
      await payload.create({
        collection: 'notifications',
        data: {
          recipient: admin.id,
          type: 'creator_application_submitted',
          title: 'New Creator Application',
          message: `${authResult.user.name || authResult.user.email} has submitted a creator application for review.`,
          priority: 'normal',
          relatedTo: {
            relationTo: 'creatorApplications',
            value: application.id,
          },
          read: false,
        }
      })
    }

    return NextResponse.json({
      success: true,
      application,
      message: 'Creator application submitted successfully! We\'ll review it and get back to you soon.'
    })

  } catch (error) {
    console.error('Error submitting creator application:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}

// GET /api/creator-application - Get user's application status
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Use Payload's built-in authentication
    const authResult = await payload.auth({ headers: request.headers })
    
    if (!authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = authResult.user.id

    // Get user's latest application
    const applications = await payload.find({
      collection: 'creatorApplications',
      where: {
        applicant: { equals: userId }
      },
      sort: '-createdAt',
      limit: 1,
    })

    const application = applications.docs[0] || null

    return NextResponse.json({
      success: true,
      application,
      hasApplication: !!application,
      status: application?.status || 'not_applied'
    })

  } catch (error) {
    console.error('Error getting creator application:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get application' },
      { status: 500 }
    )
  }
} 