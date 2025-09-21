import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '../../../../../../payload.config';

interface MobileClaimRequest {
  // Basic claim information
  contactEmail: string
  businessName: string
  ownerName: string
  ownerPhone?: string
  
  // Business details
  businessDescription?: string
  businessWebsite?: string
  
  // Verification
  claimMethod: 'email' | 'phone' | 'business_license' | 'tax_id'
  businessLicense?: string
  taxId?: string
  
  // Location enhancement (optional)
  locationData?: {
    name?: string
    description?: string
    shortDescription?: string
    categories?: string[]
    businessHours?: any[]
    amenities?: string[]
    priceRange?: string
  }
  
  // iOS specific fields
  deviceInfo?: {
    platform: 'ios'
    appVersion: string
    deviceId?: string
  }
}

interface MobileClaimResponse {
  success: boolean
  message: string
  data?: {
    claimId: string
    status: string
    estimatedReviewTime: string
    nextSteps: string[]
  }
  error?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
): Promise<NextResponse<MobileClaimResponse>> {
  try {
    const { locationId } = await params;
    const payload = await getPayload({ config });
    
    // Get the current user (for authenticated claims)
    const { user } = await payload.auth({ headers: request.headers });
    
    const body: MobileClaimRequest = await request.json();

    // Validate required fields
    if (!body.contactEmail || !body.businessName || !body.ownerName || !body.claimMethod) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields', error: 'MISSING_FIELDS' },
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
        { success: false, message: 'Location not found', error: 'LOCATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if location is already claimed
    if (location.ownership?.claimStatus === 'approved') {
      return NextResponse.json(
        { success: false, message: 'Location is already claimed', error: 'ALREADY_CLAIMED' },
        { status: 409 }
      );
    }

    // Check if user already has a pending claim for this location
    if (user && location.ownership?.ownerId === user.id && location.ownership?.claimStatus === 'pending') {
      return NextResponse.json(
        { success: false, message: 'You already have a pending claim for this location', error: 'PENDING_CLAIM_EXISTS' },
        { status: 409 }
      );
    }

    // Prepare comprehensive claim data
    const claimData: any = {
      ownership: {
        ownerId: user?.id || null, // Allow anonymous claims from mobile
        claimedAt: new Date().toISOString(),
        verificationMethod: body.claimMethod,
        businessLicense: body.businessLicense,
        taxId: body.taxId,
        claimStatus: 'pending',
        // Enhanced business information
        businessName: body.businessName,
        businessDescription: body.businessDescription,
        businessWebsite: body.businessWebsite,
        ownerName: body.ownerName,
        ownerPhone: body.ownerPhone,
        contactEmail: body.contactEmail,
        // Mobile specific data
        claimSource: 'mobile_app',
        deviceInfo: body.deviceInfo
      }
    };

    // If location enhancement data is provided, merge it
    if (body.locationData) {
      claimData.name = body.locationData.name || location.name;
      claimData.description = body.locationData.description || location.description;
      claimData.shortDescription = body.locationData.shortDescription || location.shortDescription;
      claimData.categories = body.locationData.categories || location.categories;
      claimData.businessHours = body.locationData.businessHours || location.businessHours;
      claimData.amenities = body.locationData.amenities || location.amenities;
      claimData.priceRange = body.locationData.priceRange || location.priceRange;
    }

    // Update location with comprehensive claim information
    const updatedLocation = await payload.update({
      collection: 'locations',
      id: locationId,
      data: claimData
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
            title: 'New Mobile Location Claim Request',
            message: `${body.ownerName} (${body.businessName}) is requesting to claim ownership of "${location.name}" via mobile app`,
            priority: 'normal',
            relatedTo: {
              relationTo: 'locations',
              value: locationId
            },
            read: false,
            metadata: {
              claimSource: 'mobile_app',
              deviceInfo: body.deviceInfo
            }
          },
        });
      }
    } catch (error) {
      console.error('Error creating admin notifications:', error);
    }

    // Determine next steps based on claim method
    const nextSteps = [];
    switch (body.claimMethod) {
      case 'email':
        nextSteps.push('Check your email for verification instructions');
        nextSteps.push('Click the verification link to confirm ownership');
        break;
      case 'phone':
        nextSteps.push('Expect a call from our verification team');
        nextSteps.push('Have your business documents ready');
        break;
      case 'business_license':
        nextSteps.push('Our team will verify your business license');
        nextSteps.push('You may be contacted for additional information');
        break;
      case 'tax_id':
        nextSteps.push('Our team will verify your tax ID');
        nextSteps.push('You may be contacted for additional information');
        break;
    }
    nextSteps.push('Review typically takes 2-3 business days');
    nextSteps.push('You will be notified once the review is complete');

    return NextResponse.json({
      success: true,
      message: 'Location claim submitted successfully',
      data: {
        claimId: locationId,
        status: 'pending',
        estimatedReviewTime: '2-3 business days',
        nextSteps
      }
    });

  } catch (error) {
    console.error('Error claiming location from mobile:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
): Promise<NextResponse> {
  try {
    const { locationId } = await params;
    const payload = await getPayload({ config });
    
    // Get the current user
    const { user } = await payload.auth({ headers: request.headers });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required', error: 'AUTH_REQUIRED' },
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
        { success: false, message: 'Location not found', error: 'LOCATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if user is admin or the business owner
    const canViewClaim = user.role === 'admin' || 
                        (user.isBusinessOwner && location.ownership?.ownerId === user.id);

    if (!canViewClaim) {
      return NextResponse.json(
        { success: false, message: 'Access denied', error: 'ACCESS_DENIED' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        locationId,
        locationName: location.name,
        claimStatus: location.ownership?.claimStatus || 'unclaimed',
        ownerId: location.ownership?.ownerId,
        claimedAt: location.ownership?.claimedAt,
        verifiedAt: location.ownership?.verifiedAt,
        verificationMethod: location.ownership?.verificationMethod,
        businessName: location.ownership?.businessName,
        ownerName: location.ownership?.ownerName,
        contactEmail: location.ownership?.contactEmail,
        rejectionReason: location.ownership?.rejectionReason,
        claimSource: location.ownership?.claimSource || 'web'
      }
    });

  } catch (error) {
    console.error('Error getting mobile location claim status:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
