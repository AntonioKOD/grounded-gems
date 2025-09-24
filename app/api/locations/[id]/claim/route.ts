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
  // Enhanced business information
  businessName?: string;
  businessAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  businessWebsite?: string;
  businessDescription?: string;
  businessHours?: any[];
  businessServices?: string[];
  businessPhotos?: string[];
  // Additional verification documents
  additionalDocuments?: {
    utilityBill?: string;
    leaseAgreement?: string;
    insuranceCertificate?: string;
    other?: string[];
  };
  // Business owner information
  ownerName?: string;
  ownerTitle?: string;
  ownerPhone?: string;
  // Location enhancement data
  locationData?: {
    name?: string;
    description?: string;
    shortDescription?: string;
    categories?: string[];
    featuredImage?: string;
    gallery?: any[];
    businessHours?: any[];
    contactInfo?: any;
    amenities?: string[];
    priceRange?: string;
  };
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

    // Allow any authenticated user to claim a business
    // Business owner verification is optional for claiming

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

    // Prepare comprehensive claim data
    const claimData: any = {
      ownership: {
        ownerId: user.id,
        claimedAt: new Date().toISOString(),
        verificationMethod: body.claimMethod,
        businessLicense: body.businessLicense,
        taxId: body.taxId,
        claimStatus: 'pending',
        // Enhanced business information
        businessName: body.businessName,
        businessAddress: body.businessAddress,
        businessWebsite: body.businessWebsite,
        businessDescription: body.businessDescription,
        businessHours: body.businessHours,
        businessServices: body.businessServices,
        businessPhotos: body.businessPhotos,
        additionalDocuments: body.additionalDocuments,
        ownerName: body.ownerName,
        ownerTitle: body.ownerTitle,
        ownerPhone: body.ownerPhone,
        contactEmail: body.contactEmail,
        phoneNumber: body.phoneNumber
      }
    };

    // If location enhancement data is provided, merge it
    if (body.locationData) {
      claimData.name = body.locationData.name || location.name;
      claimData.description = body.locationData.description || location.description;
      claimData.shortDescription = body.locationData.shortDescription || location.shortDescription;
      claimData.categories = body.locationData.categories || location.categories;
      claimData.featuredImage = body.locationData.featuredImage || location.featuredImage;
      claimData.gallery = body.locationData.gallery || location.gallery;
      claimData.businessHours = body.locationData.businessHours || location.businessHours;
      claimData.contactInfo = body.locationData.contactInfo || location.contactInfo;
      claimData.amenities = body.locationData.amenities || location.amenities;
      claimData.priceRange = body.locationData.priceRange || location.priceRange;
    }

    // Update location with comprehensive claim information
    const updatedLocation = await payload.update({
      collection: 'locations',
      id: locationId,
      data: claimData
    });

    // Send email notification to admin
    try {
      const adminEmail = 'antonio_kodheli@icloud.com'
      
      // Send email notification
      await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: adminEmail,
          subject: `New Business Claim: ${location.name}`,
          template: 'business-claim-notification',
          data: {
            locationName: location.name,
            locationId: locationId,
            claimantName: user.name || user.email,
            claimantEmail: user.email,
            claimMethod: body.claimMethod,
            businessName: body.businessName,
            businessDescription: body.businessDescription,
            businessAddress: body.businessAddress,
            businessWebsite: body.businessWebsite,
            ownerName: body.ownerName,
            ownerPhone: body.ownerPhone,
            claimUrl: `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/admin/claims/${locationId}`,
            locationUrl: `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/locations/${location.slug || locationId}`
          }
        })
      })
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError)
      // Don't fail the claim if email fails
    }

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
    
    // Get the current user (optional for viewing claim status)
    const { user } = await payload.auth({ headers: request.headers });

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

    // Allow anyone to view basic claim status, but restrict detailed info to admins and owners
    const isAdmin = user?.role === 'admin';
    const isOwner = user && location.ownership?.ownerId === user.id;
    const canViewDetailedClaim = isAdmin || isOwner;

    const responseData: any = {
      locationId,
      claimStatus: location.ownership?.claimStatus || 'unclaimed',
    };

    // Only include detailed claim information for admins and owners
    if (canViewDetailedClaim) {
      responseData.ownerId = typeof location.ownership?.ownerId === 'string' 
        ? location.ownership.ownerId 
        : location.ownership?.ownerId?.id || null;
      responseData.claimedAt = location.ownership?.claimedAt;
      responseData.verifiedAt = location.ownership?.verifiedAt;
      responseData.verificationMethod = location.ownership?.verificationMethod;
      responseData.rejectionReason = location.ownership?.rejectionReason;
    }

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error getting location claim status:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 