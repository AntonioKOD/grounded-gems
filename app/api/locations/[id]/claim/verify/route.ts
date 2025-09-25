import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config });
    
    // Get the token from query parameters
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.redirect(new URL('/?error=missing-token', request.url));
    }
    
    // Get the location
    const location = await payload.findByID({
      collection: 'locations',
      id: params.id,
    });
    
    if (!location) {
      return NextResponse.redirect(new URL('/?error=location-not-found', request.url));
    }
    
    // Validate token and expiry
    if (!location.ownership?.claimToken || location.ownership.claimToken !== token) {
      return NextResponse.redirect(new URL('/?error=invalid-token', request.url));
    }
    
    // Check if token has expired
    if (!location.ownership?.claimTokenExpires) {
      return NextResponse.redirect(new URL('/?error=token-expired', request.url));
    }
    
    const tokenExpiry = new Date(location.ownership.claimTokenExpires);
    const now = new Date();
    
    if (tokenExpiry < now) {
      return NextResponse.redirect(new URL('/?error=token-expired', request.url));
    }
    
    // Ensure claim status is pending
    if (location.ownership?.claimStatus !== 'pending') {
      return NextResponse.redirect(new URL('/?error=invalid-claim-status', request.url));
    }
    
    // Update the location with approved claim status
    await payload.update({
      collection: 'locations',
      id: params.id,
      data: {
        ownership: {
          ...location.ownership,
          claimStatus: 'approved',
          claimedAt: new Date().toISOString(),
          // Clear token fields for security
          claimToken: undefined,
          claimTokenExpires: undefined,
        },
      },
    });
    
    // Redirect to the add page with claim mode
    const redirectUrl = new URL('/add', request.url);
    redirectUrl.searchParams.set('mode', 'claim');
    redirectUrl.searchParams.set('locationId', params.id);
    
    return NextResponse.redirect(redirectUrl);
    
  } catch (error) {
    console.error('Error in claim verification:', error);
    return NextResponse.redirect(new URL('/?error=verification-failed', request.url));
  }
}









