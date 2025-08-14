import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '../../../../payload.config';

interface BusinessOwnerDashboardResponse {
  success: boolean;
  message: string;
  data?: {
    profile: {
      businessName: string;
      contactEmail: string;
      verificationStatus: string;
      businessType: string;
    };
    ownedLocations: Array<{
      id: string;
      name: string;
      address?: string;
      status: string;
      allowSpecials: boolean;
      subscriberCount: number;
      lastSpecialSent?: string;
    }>;
    stats: {
      totalLocations: number;
      totalSubscribers: number;
      activeSpecials: number;
      pendingClaims: number;
    };
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<BusinessOwnerDashboardResponse>> {
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

    // Check if user is a business owner
    if (!user.isBusinessOwner) {
      return NextResponse.json(
        { success: false, message: 'Business owner status required' },
        { status: 403 }
      );
    }

    // Get owned locations
    const ownedLocations = await payload.find({
      collection: 'locations',
      where: {
        'ownership.ownerId': { equals: user.id },
        'ownership.claimStatus': { equals: 'approved' }
      },
      depth: 1
    });

    // Get pending claims
    const pendingClaims = await payload.find({
      collection: 'locations',
      where: {
        'ownership.ownerId': { equals: user.id },
        'ownership.claimStatus': { equals: 'pending' }
      },
      depth: 0
    });

    // Get active specials
    const activeSpecials = await payload.find({
      collection: 'specials',
      where: {
        businessOwner: { equals: user.id },
        status: { equals: 'published' }
      },
      depth: 0
    });

    // Calculate total subscribers across all owned locations
    let totalSubscribers = 0;
    const locationDetails = [];

    for (const location of ownedLocations.docs) {
      // Get subscriber count for this location
      const followers = await payload.find({
        collection: 'locationFollowers',
        where: { location: { equals: location.id } },
        depth: 0
      });

      const subscriberCount = followers.docs.length;
      totalSubscribers += subscriberCount;

      // Get last special sent for this location
      const lastSpecial = await payload.find({
        collection: 'specials',
        where: {
          location: { equals: location.id },
          businessOwner: { equals: user.id }
        },
        sort: '-createdAt',
        limit: 1,
        depth: 0
      });

      locationDetails.push({
        id: String(location.id),
        name: String(location.name),
        address: location.address ? `${location.address.street}, ${location.address.city}` : undefined,
        status: String(location.status),
        allowSpecials: Boolean(location.businessSettings?.allowSpecials || false),
        subscriberCount,
        lastSpecialSent: lastSpecial.docs[0]?.createdAt
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: {
        profile: {
          businessName: user.businessOwnerProfile?.businessName || 'Unnamed Business',
          contactEmail: user.businessOwnerProfile?.contactEmail || user.email,
          verificationStatus: user.businessOwnerProfile?.verificationStatus || 'pending',
          businessType: user.businessOwnerProfile?.businessType || 'other'
        },
        ownedLocations: locationDetails,
        stats: {
          totalLocations: ownedLocations.docs.length,
          totalSubscribers,
          activeSpecials: activeSpecials.docs.length,
          pendingClaims: pendingClaims.docs.length
        }
      }
    });

  } catch (error) {
    console.error('Error getting business owner dashboard:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 