import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

// PUT /api/locations/[id]/edit - Update a location
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params;
    
    let body;
    const contentType = req.headers.get('content-type') || '';
    
    try {
      if (contentType.includes('multipart/form-data')) {
        // Handle multipart form data (from Payload CMS admin)
        const formData = await req.formData();
        const payloadData = formData.get('_payload');
        
        if (payloadData && typeof payloadData === 'string') {
          body = JSON.parse(payloadData);
        } else {
          body = {};
        }
      } else {
        // Handle regular JSON
        body = await req.json();
      }
    } catch (error) {
      console.error('❌ Error parsing request body in edit endpoint:', error);
      return NextResponse.json(
        { error: 'Invalid request body format' },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    // Get user from session
    const { user } = await payload.auth({ headers: req.headers });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the existing location
    const existingLocation = await payload.findByID({
      collection: 'locations',
      id: locationId,
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Check if user is the owner of the location
    const locationCreatedBy = typeof existingLocation.createdBy === 'string' 
      ? existingLocation.createdBy 
      : existingLocation.createdBy?.id;

    if (locationCreatedBy !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You can only edit locations you created' },
        { status: 403 }
      );
    }

    // Validate required fields
    const hasValidAddress = body.address && (
      (typeof body.address === 'string' && body.address.trim()) ||
      (typeof body.address === 'object' && body.address.street?.trim())
    );

    if (!body.name?.trim() || !hasValidAddress) {
      return NextResponse.json(
        { error: 'Name and street address are required' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      name: body.name.trim(),
      description: body.description?.trim() || '',
    };

    // Handle address - support both string and object formats
    if (body.address) {
      if (typeof body.address === 'string') {
        updateData.address = body.address.trim();
      } else if (typeof body.address === 'object') {
        updateData.address = {
          street: body.address.street?.trim() || '',
          city: body.address.city?.trim() || '',
          state: body.address.state?.trim() || '',
          zip: body.address.zip?.trim() || '',
          country: body.address.country?.trim() || 'US',
        };
      }
    }

    // Handle other fields
    if (body.neighborhood) updateData.neighborhood = body.neighborhood.trim();
    if (body.categories) updateData.categories = body.categories;
    if (body.tags) updateData.tags = body.tags;
    if (body.priceRange) updateData.priceRange = body.priceRange;
    
    // Handle contact info
    if (body.contactInfo) {
      updateData.contactInfo = {
        phone: body.contactInfo.phone?.trim() || '',
        email: body.contactInfo.email?.trim() || '',
        website: body.contactInfo.website?.trim() || '',
        socialMedia: {
          facebook: body.contactInfo.socialMedia?.facebook?.trim() || '',
          twitter: body.contactInfo.socialMedia?.twitter?.trim() || '',
          instagram: body.contactInfo.socialMedia?.instagram?.trim() || '',
          linkedin: body.contactInfo.socialMedia?.linkedin?.trim() || '',
        },
      };
    }

    // Handle business hours
    if (body.businessHours) updateData.businessHours = body.businessHours;

    // Handle accessibility
    if (body.accessibility) updateData.accessibility = body.accessibility;

    // Handle other optional fields
    if (body.bestTimeToVisit) updateData.bestTimeToVisit = body.bestTimeToVisit;
    if (body.insiderTips) updateData.insiderTips = body.insiderTips;
    if (body.hasBusinessPartnership !== undefined) updateData.hasBusinessPartnership = body.hasBusinessPartnership;
    if (body.partnershipDetails) updateData.partnershipDetails = body.partnershipDetails;
    if (body.meta) updateData.meta = body.meta;
    if (body.status) updateData.status = body.status;
    if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
    if (body.isVerified !== undefined) updateData.isVerified = body.isVerified;

    // Check if address changed for potential geocoding
    const addressChanged = () => {
      if (!body.address) return false;
      
      if (typeof body.address === 'string') {
        return body.address !== (typeof existingLocation.address === 'string' 
          ? existingLocation.address 
          : `${existingLocation.address?.street || ''}, ${existingLocation.address?.city || ''}, ${existingLocation.address?.state || ''}`);
      } else if (typeof body.address === 'object') {
        const existing = existingLocation.address;
        if (typeof existing === 'string') return true; // Different formats
        return (
          body.address.street !== existing?.street ||
          body.address.city !== existing?.city ||
          body.address.state !== existing?.state ||
          body.address.zip !== existing?.zip
        );
      }
      return false;
    };

    if (addressChanged()) {
      try {
        // Keep existing coordinates for now
        // You can add geocoding logic here if needed
        if (existingLocation.coordinates) {
          updateData.coordinates = existingLocation.coordinates;
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        // Continue without geocoding
      }
    }

    // Update the location
    const updatedLocation = await payload.update({
      collection: 'locations',
      id: locationId,
      data: updateData,
    });

    // Create activity log entry
    try {
      await payload.create({
        collection: 'locationActivityLogs',
        data: {
          location: locationId,
          user: user.id,
          action: 'location_updated',
          details: {
            fieldsChanged: Object.keys(body),
            previousData: {
              name: existingLocation.name,
              address: existingLocation.address,
              categories: existingLocation.categories,
            },
            newData: {
              name: updateData.name,
              address: updateData.address,
              categories: updateData.categories,
            },
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error creating activity log:', error);
      // Continue even if activity log fails
    }

    // If location was made public and wasn't before, create notification for followers
    if (updateData.isPublic && !existingLocation.isPublic) {
      try {
        // Get user's followers
        const followers = await payload.find({
          collection: 'follows',
          where: {
            following: { equals: user.id },
          },
          limit: 100,
        });

        // Create notifications for followers
        const notifications = followers.docs.map(follow => ({
          recipient: typeof follow.follower === 'string' ? follow.follower : follow.follower.id,
          type: 'location_updated',
          title: 'Location Updated',
          message: `${user.name || 'Someone you follow'} updated ${updatedLocation.name}`,
          actionBy: user.id,
          priority: 'low',
          relatedTo: {
            relationTo: 'locations',
            value: locationId,
          },
          metadata: {
            locationName: updatedLocation.name,
            action: 'updated',
          },
          read: false,
        }));

        // Batch create notifications
        for (const notification of notifications.slice(0, 50)) { // Limit to 50 to avoid overload
          try {
            await payload.create({
              collection: 'notifications',
              data: notification,
            });
          } catch (error) {
            console.error('Error creating follower notification:', error);
          }
        }
      } catch (error) {
        console.error('Error notifying followers:', error);
      }
    }

    return NextResponse.json({
      success: true,
      location: updatedLocation,
      message: 'Location updated successfully',
    });

  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

// GET /api/locations/[id]/edit - Get location for editing (with edit permissions check)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params;

    const payload = await getPayload({ config });

    // Get user from session
    const { user } = await payload.auth({ headers: req.headers });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the location with all details
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
      depth: 2,
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Check if user can edit this location
    const locationCreatedBy = typeof location.createdBy === 'string' 
      ? location.createdBy 
      : location.createdBy?.id;

    if (locationCreatedBy !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You can only edit locations you created' },
        { status: 403 }
      );
    }

    // Get location statistics
    let stats = {};
    try {
      // Get view count
      const viewsResult = await payload.find({
        collection: 'locationViews',
        where: {
          location: { equals: locationId },
        },
      });

      // Get photo count
      const photosResult = await payload.find({
        collection: 'locationPhotoSubmissions',
        where: {
          and: [
            { location: { equals: locationId } },
            { status: { equals: 'approved' } },
          ],
        },
      });

      // Get review count
      const reviewsResult = await payload.find({
        collection: 'reviews',
        where: {
          location: { equals: locationId },
        },
      });

      // Get save count
      const savesResult = await payload.find({
        collection: 'userSavedLocations',
        where: {
          location: { equals: locationId },
        },
      });

      stats = {
        views: viewsResult.totalDocs || 0,
        photos: photosResult.totalDocs || 0,
        reviews: reviewsResult.totalDocs || 0,
        saves: savesResult.totalDocs || 0,
      };
    } catch (error) {
      console.error('Error fetching location stats:', error);
      stats = { views: 0, photos: 0, reviews: 0, saves: 0 };
    }

    return NextResponse.json({
      success: true,
      location: {
        ...location,
        stats,
      },
    });

  } catch (error) {
    console.error('Error fetching location for editing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}

// DELETE /api/locations/[id]/edit - Delete a location
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params;

    const payload = await getPayload({ config });

    // Get user from session
    const { user } = await payload.auth({ headers: req.headers });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the existing location
    const existingLocation = await payload.findByID({
      collection: 'locations',
      id: locationId,
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Check if user is the owner of the location
    const locationCreatedBy = typeof existingLocation.createdBy === 'string' 
      ? existingLocation.createdBy 
      : existingLocation.createdBy?.id;

    if (locationCreatedBy !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You can only delete locations you created' },
        { status: 403 }
      );
    }

    // Soft delete the location (mark as deleted instead of actually deleting)
    const deletedLocation = await payload.update({
      collection: 'locations',
      id: locationId,
      data: {
        isDeleted: true,
        isPublic: false,
        deletedAt: new Date().toISOString(),
        deletedBy: user.id,
      },
    });

    // Create activity log entry
    try {
      await payload.create({
        collection: 'locationActivityLogs',
        data: {
          location: locationId,
          user: user.id,
          action: 'location_deleted',
          details: {
            locationName: existingLocation.name,
            address: existingLocation.address,
            deletedAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error creating activity log:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    );
  }
} 