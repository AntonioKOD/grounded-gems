import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await getPayload({ config });

    const location = await payload.findByID({
      collection: 'locations',
      id,
      depth: 2,
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Determine location type for event handling
    const locationCategories = location.categories?.map((cat: any) => 
      typeof cat === 'string' ? cat : cat.name
    ) || [];

    // Private venues that require event requests (owners need to approve)
    const privateVenueCategories = [
      'Restaurants', 'Restaurant', 'Bars', 'Bar', 'Cafes', 'Cafe', 'Coffee Shops', 'Coffee Shop',
      'Event Venues', 'Event Venue', 'Hotels', 'Hotel', 'Clubs', 'Club', 'Lounges', 'Lounge',
      'Wineries', 'Winery', 'Breweries', 'Brewery', 'Entertainment Venues', 'Entertainment Venue',
      'Shopping Centers', 'Shopping Center', 'Malls', 'Mall', 'Retail', 'Stores', 'Store'
    ];

    // Public spaces that allow direct event creation (no approval needed)
    const publicSpaceCategories = [
      'Parks', 'Park', 'Beaches', 'Beach', 'Public Spaces', 'Public Space', 'Recreation Areas', 'Recreation Area',
      'Trails', 'Trail', 'Gardens', 'Garden', 'Playgrounds', 'Playground', 'Sports Fields', 'Sports Field',
      'Community Centers', 'Community Center', 'Libraries', 'Library', 'Museums', 'Museum', 'Galleries', 'Gallery'
    ];

    const isPrivateVenue = privateVenueCategories.some(category => 
      locationCategories.some(locCat => locCat.toLowerCase().includes(category.toLowerCase()) || category.toLowerCase().includes(locCat.toLowerCase()))
    );

    const isPublicSpace = publicSpaceCategories.some(category => 
      locationCategories.some(locCat => locCat.toLowerCase().includes(category.toLowerCase()) || category.toLowerCase().includes(locCat.toLowerCase()))
    );

    // Determine event capabilities
    let eventCapability = 'none';
    if (isPublicSpace && !isPrivateVenue) {
      eventCapability = 'direct_creation'; // Can create events directly
    } else if (isPrivateVenue || location.createdBy) {
      eventCapability = 'request_required'; // Need to request from owner
    }

    const locationWithEventInfo = {
      ...location,
      eventCapability,
      isPrivateVenue,
      isPublicSpace,
      hasOwner: !!location.createdBy,
    };

    return NextResponse.json({ location: locationWithEventInfo });
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params
    const payload = await getPayload({ config })
    const body = await req.json()

    // Update the location
    const updatedLocation = await payload.update({
      collection: 'locations',
      id: locationId,
      data: body,
    })

    return NextResponse.json({
      success: true,
      location: updatedLocation,
    })
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    )
  }
} 