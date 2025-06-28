import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// POST /api/creator-application - Submit a creator application
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const data = await request.json()

    // Get the user from the request (you'll need to implement auth middleware)
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // For now, we'll assume the user ID is passed in the request body
    // In a real implementation, you'd extract this from the JWT token
    const { 
      userId,
      motivation, 
      experienceLevel, 
      localAreas, 
      specialties, 
      portfolioDescription, 
      socialMedia 
    } = data

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

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

    // Get user details
    const user = await payload.findByID({
      collection: 'users',
      id: userId
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Create the application
    const application = await payload.create({
      collection: 'creatorApplications',
      data: {
        applicant: userId,
        applicantName: user.name || user.username || user.email,
        applicantEmail: user.email,
        motivation,
        experienceLevel,
        localAreas,
        specialties,
        portfolioDescription,
        socialMedia,
        status: 'pending',
      }
    })

    // Update user's application status
    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        'creatorProfile.applicationStatus': 'pending'
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
          message: `${user.name || user.email} has submitted a creator application for review.`,
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
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

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