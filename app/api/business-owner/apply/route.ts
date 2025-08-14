import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '../../../../payload.config';

interface BusinessOwnerApplicationRequest {
  businessName: string;
  businessType: 'restaurant' | 'retail' | 'service' | 'entertainment' | 'other';
  contactEmail: string;
  phoneNumber?: string;
  website?: string;
  businessDescription: string;
  verificationDocuments?: string[];
  locationsToClaim?: string[];
}

interface ApplicationResponse {
  success: boolean;
  message: string;
  data?: {
    applicationId: string;
    status: string;
    estimatedReviewTime: string;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApplicationResponse>> {
  try {
    const payload = await getPayload({ config });
    
    // Get the current user
    const { user } = await payload.auth({ headers: request.headers });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is already a business owner
    if (user.isBusinessOwner) {
      return NextResponse.json(
        { success: false, message: 'You are already a business owner' },
        { status: 409 }
      );
    }

    // Check if user already has a pending application
    const existingApplication = await payload.find({
      collection: 'business-owner-applications',
      where: {
        applicant: { equals: user.id },
        status: { equals: 'pending' }
      },
      depth: 0
    });

    if (existingApplication.docs.length > 0) {
      return NextResponse.json(
        { success: false, message: 'You already have a pending application' },
        { status: 409 }
      );
    }

    const body: BusinessOwnerApplicationRequest = await request.json();

    // Validate required fields
    if (!body.businessName || !body.businessType || !body.contactEmail || !body.businessDescription) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.contactEmail)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate locations to claim if provided
    if (body.locationsToClaim && body.locationsToClaim.length > 0) {
      for (const locationId of body.locationsToClaim) {
        const location = await payload.findByID({
          collection: 'locations',
          id: locationId,
        });

        if (!location) {
          return NextResponse.json(
            { success: false, message: `Location ${locationId} not found` },
            { status: 404 }
          );
        }

        // Check if location is already claimed
        if (location.ownership?.claimStatus === 'approved') {
          return NextResponse.json(
            { success: false, message: `Location "${location.name}" is already claimed` },
            { status: 409 }
          );
        }
      }
    }

    // Create the application
    const application = await payload.create({
      collection: 'business-owner-applications',
      data: {
        applicant: user.id,
        businessName: body.businessName,
        businessType: body.businessType,
        contactEmail: body.contactEmail,
        phoneNumber: body.phoneNumber,
        website: body.website,
        businessDescription: body.businessDescription,
        verificationDocuments: body.verificationDocuments,
        locationsToClaim: body.locationsToClaim,
        status: 'pending',
        submittedAt: new Date().toISOString()
      }
    });

    // Create notification for admins
    try {
      const admins = await payload.find({
        collection: 'users',
        where: { role: { equals: 'admin' } },
        depth: 0
      });

      for (const admin of admins.docs) {
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: admin.id,
            type: 'business_owner_application',
            title: 'New Business Owner Application',
            message: `${user.name} has applied to become a business owner for "${body.businessName}"`,
            priority: 'normal',
            relatedTo: {
              relationTo: 'business-owner-applications',
              value: application.id
            },
            read: false,
          },
        });
      }
    } catch (error) {
      console.error('Error creating admin notifications:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        applicationId: String(application.id),
        status: 'pending',
        estimatedReviewTime: '2-3 business days'
      }
    });

  } catch (error) {
    console.error('Error submitting business owner application:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = await getPayload({ config });
    
    // Get the current user
    const { user } = await payload.auth({ headers: request.headers });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's applications
    const applications = await payload.find({
      collection: 'business-owner-applications',
      where: { applicant: { equals: user.id } },
      sort: '-submittedAt',
      depth: 1
    });

    return NextResponse.json({
      success: true,
      message: 'Applications retrieved successfully',
      data: {
        applications: applications.docs,
        isBusinessOwner: user.isBusinessOwner,
        businessOwnerProfile: user.businessOwnerProfile
      }
    });

  } catch (error) {
    console.error('Error getting applications:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 