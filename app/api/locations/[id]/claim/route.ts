import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '../../../../../payload.config';

interface ClaimRequest {
  claimMethod: 'manual' | 'document' | 'phone' | 'email';
  businessLicense?: string;
  taxId?: string;
  verificationDocuments?: string[];
  contactEmail: string;
  phoneNumber?: string;
}

interface ClaimResponse {
  success: boolean;
  message: string;
  data?: {
    claimId: string;
    status: string;
    estimatedReviewTime: string;
  };
  error?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ClaimResponse>> {
  try {
    const { id: locationId } = await params;
    const payload = await getPayload({ config });
    
    // Get the current user
    const { user } = await payload.auth({ headers: request.headers });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is a business owner
    if (!user.isBusinessOwner) {
      return NextResponse.json(
        { success: false, message: 'Business owner status required' },
        { status: 403 }
      );
    }

    // Check if business owner is verified
    if (user.businessOwnerProfile?.verificationStatus !== 'verified') {
      return NextResponse.json(
        { success: false, message: 'Business owner verification required' },
        { status: 403 }
      );
    }

    const body: ClaimRequest = await request.json();

    // Validate required fields
    if (!body.claimMethod || !body.contactEmail) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if location exists
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
    });

    if (!location) {
      return NextResponse.json(
        { success: false, message: 'Location not found' },
        { status: 404 }
      );
    }

    // Check if location is already claimed
    if (location.ownership?.claimStatus === 'approved') {
      return NextResponse.json(
        { success: false, message: 'Location is already claimed' },
        { status: 409 }
      );
    }

    // Check if user already has a pending claim for this location
    if (location.ownership?.claimStatus === 'pending' && location.ownership?.ownerId === user.id) {
      return NextResponse.json(
        { success: false, message: 'You already have a pending claim for this location' },
        { status: 409 }
      );
    }

    // Update location with claim information
    const updatedLocation = await payload.update({
      collection: 'locations',
      id: locationId,
      data: {
        ownership: {
          ownerId: user.id,
          claimedAt: new Date().toISOString(),
          verificationMethod: body.claimMethod,
          businessLicense: body.businessLicense,
          taxId: body.taxId,
          claimStatus: 'pending'
        }
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
            type: 'location_claim',
            title: 'New Location Claim Request',
            message: `${user.name} is requesting to claim ownership of "${location.name}"`,
            priority: 'normal',
            relatedTo: {
              relationTo: 'locations',
              value: locationId
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
      message: 'Location claim submitted successfully',
      data: {
        claimId: locationId,
        status: 'pending',
        estimatedReviewTime: '2-3 business days'
      }
    });

  } catch (error) {
    console.error('Error claiming location:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: locationId } = await params;
    const payload = await getPayload({ config });
    
    // Get the current user
    const { user } = await payload.auth({ headers: request.headers });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get location with ownership information
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
    });

    if (!location) {
      return NextResponse.json(
        { success: false, message: 'Location not found' },
        { status: 404 }
      );
    }

    // Check if user is admin or the business owner
    const canViewClaim = user.role === 'admin' || 
                        (user.isBusinessOwner && location.ownership?.ownerId === user.id);

    if (!canViewClaim) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        locationId,
        claimStatus: location.ownership?.claimStatus || 'unclaimed',
        ownerId: location.ownership?.ownerId,
        claimedAt: location.ownership?.claimedAt,
        verifiedAt: location.ownership?.verifiedAt,
        verificationMethod: location.ownership?.verificationMethod,
        rejectionReason: location.ownership?.rejectionReason
      }
    });

  } catch (error) {
    console.error('Error getting location claim status:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 