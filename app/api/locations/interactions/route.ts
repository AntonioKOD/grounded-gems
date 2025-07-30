import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

// Request deduplication cache
const pendingRequests = new Map();
const DEDUPLICATION_WINDOW = 5000; // 5 seconds

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const body = await req.json();
    
    const { 
      locationId, 
      interactionType, 
      metadata = {}, 
      coordinates, 
      platform = 'web',
      duration,
      referrerSource
    } = body;

    // Get user from session/auth
    const { user } = await payload.auth({ headers: req.headers });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('User from auth:', { id: user.id, email: user.email });

    // Ensure user.id is properly formatted for relationship field
    let userId: string;
    if (typeof user.id === 'string') {
      userId = user.id;
    } else if (typeof user.id === 'object' && user.id !== null) {
      userId = String(user.id);
    } else {
      userId = String(user.id);
    }
    
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.error('Invalid user ID from auth:', user);
      return NextResponse.json(
        { error: 'Invalid user authentication data' },
        { status: 400 }
      );
    }

    if (!locationId || !interactionType) {
      return NextResponse.json(
        { error: 'Missing required fields: locationId and interactionType' },
        { status: 400 }
      );
    }

    // Check for duplicate requests
    const requestKey = `${userId}-${locationId}-${interactionType}`;
    const existingRequest = pendingRequests.get(requestKey);
    if (existingRequest && (Date.now() - existingRequest) < DEDUPLICATION_WINDOW) {
      return NextResponse.json(
        { error: 'Duplicate request detected, please wait' },
        { status: 429 }
      );
    }
    pendingRequests.set(requestKey, Date.now());

    console.log('Creating interaction with:', {
      userId,
      locationId,
      interactionType,
      userObjectType: typeof userId,
    });

    try {
      // Validate location exists
      const location = await payload.findByID({
        collection: 'locations',
        id: locationId,
      });

      if (!location) {
        pendingRequests.delete(requestKey);
        return NextResponse.json(
          { error: 'Location not found' },
          { status: 404 }
        );
      }

      // For interactions that should be unique (like, save, subscribe), check if it already exists
      const uniqueInteractions = ['like', 'save', 'subscribe'];
      
      if (uniqueInteractions.includes(interactionType)) {
        const existing = await payload.find({
          collection: 'locationInteractions',
          where: {
            user: { equals: userId },
            location: { equals: locationId },
            type: { equals: interactionType },
          },
          limit: 1,
        });

        if (existing.docs.length > 0) {
          pendingRequests.delete(requestKey);
          return NextResponse.json(
            { error: `User has already ${interactionType}d this location` },
            { status: 409 }
          );
        }
      }

      // Determine verification status based on coordinates
      let verificationStatus = 'unverified';
      if (coordinates && location.coordinates) {
        const distance = calculateDistance(
          coordinates.latitude,
          coordinates.longitude,
          location.coordinates.latitude,
          location.coordinates.longitude
        );
        
        // If within 100 meters, mark as proximity verified
        if (distance <= 100) {
          verificationStatus = 'proximity_verified';
        }
      }

      // Prepare the data object for creation - USER FIELD MUST BE OBJECT ID STRING
      const interactionData = {
        user: userId, // This should be a valid ObjectId string for the relationship
        location: locationId, // This should be a valid ObjectId string for the relationship
        type: interactionType,
        metadata: {
          ...metadata,
          userAgent: req.headers.get('user-agent'),
          timestamp: new Date().toISOString(),
        },
        coordinates,
        platform,
        verificationStatus,
        duration,
        referrerSource,
        deviceInfo: {
          userAgent: req.headers.get('user-agent'),
          acceptLanguage: req.headers.get('accept-language'),
          referer: req.headers.get('referer'),
        },
      };

      console.log('About to create interaction with data:', JSON.stringify(interactionData, null, 2));

      // Create the interaction
      const interaction = await payload.create({
        collection: 'locationInteractions',
        data: interactionData,
      });

      console.log('Interaction created successfully:', interaction.id);

      // Handle special interaction types
      switch (interactionType) {
        case 'like':
          await notifyUsersAboutLocationActivity(locationId, 'like', interaction, payload)
          await checkAndNotifyMilestones(locationId, 'like', payload)
          break;
        
        case 'save':
          await checkAndNotifyMilestones(locationId, 'save', payload)
          break;
        
        case 'checkIn':
        case 'check_in':
          await notifyUsersAboutLocationActivity(locationId, 'check_in', interaction, payload)
          await checkAndNotifyMilestones(locationId, 'check_in', payload)
          break;
        
        case 'share':
          await notifyUsersAboutLocationActivity(locationId, 'share', interaction, payload)
          await checkAndNotifyMilestones(locationId, 'share', payload)
          break;
      }

      // Clean up request tracking
      pendingRequests.delete(requestKey);

      return NextResponse.json({
        success: true,
        interaction,
        message: `Successfully recorded ${interactionType} interaction`,
      });

    } catch (creationError) {
      console.error('Error during interaction creation:', creationError);
      pendingRequests.delete(requestKey);
      
      // Handle specific validation errors
      if (typeof creationError === 'object' && creationError !== null && 'message' in creationError && typeof (creationError as any).message === 'string' && (creationError as any).message.includes('ValidationError')) {
        return NextResponse.json(
          { error: 'Invalid data provided for interaction' },
          { status: 400 }
        );
      }
      
      throw creationError;
    }

  } catch (error) {
    console.error('Error creating location interaction:', error);
    if (typeof error === 'object' && error !== null) {
      console.error('Error details:', {
        message: 'message' in error ? (error as any).message : 'No message',
        stack: 'stack' in error ? (error as any).stack : 'No stack',
        data: 'data' in error ? (error as any).data : 'No additional data'
      });
    }
    return NextResponse.json(
      { error: 'Failed to record interaction' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('Fetching location interactions...')
    
    const { searchParams } = new URL(req.url)
    const locationId = searchParams.get('locationId')
    const interactionType = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '100')

    const payload = await getPayload({ config })

    // Build query conditions
    const whereConditions: any = {}
    
    if (locationId) {
      whereConditions.location = { equals: locationId }
    }
    
    if (interactionType) {
      whereConditions.type = { equals: interactionType }
    }

    const { docs: interactions } = await payload.find({
      collection: 'locationInteractions',
      where: whereConditions,
      limit,
      sort: '-createdAt',
      depth: 2,
    })

    console.log(`Found ${interactions.length} interactions`)

    // Format interactions for frontend with proper ID extraction
    const formattedInteractions = interactions.map((interaction) => {
      // Extract location ID properly
      const locationId = typeof interaction.location === 'string'
        ? interaction.location
        : interaction.location?.id || interaction.location

      // Extract user ID properly  
      const userId = typeof interaction.user === 'string'
        ? interaction.user
        : interaction.user?.id || interaction.user

      return {
        id: interaction.id,
        user: userId,
        location: locationId,
        type: interaction.type,
        metadata: interaction.metadata,
        coordinates: interaction.coordinates,
        platform: interaction.platform,
        verificationStatus: interaction.verificationStatus,
        createdAt: interaction.createdAt,
      }
    })

    // If filtering by a specific location, also return counts
    let counts = undefined
    if (locationId) {
      const locationInteractions = formattedInteractions.filter(i => i.location === locationId)
      counts = {
        likes: locationInteractions.filter(i => i.type === 'like').length,
        saves: locationInteractions.filter(i => i.type === 'save').length,
        checkIns: locationInteractions.filter(i => i.type === 'check_in').length,
        visits: locationInteractions.filter(i => i.type === 'visit').length,
        shares: locationInteractions.filter(i => i.type === 'share').length,
      }
    }

    return NextResponse.json({
      success: true,
      interactions: formattedInteractions,
      ...(counts && { counts }),
      total: interactions.length,
      locationId,
    })

  } catch (error) {
    console.error('Error fetching location interactions:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch interactions', error: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const { searchParams } = new URL(req.url);
    
    const locationId = searchParams.get('locationId');
    const interactionType = searchParams.get('type');

    // Get user from session/auth
    const { user } = await payload.auth({ headers: req.headers });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('DELETE - User from auth:', { id: user.id, email: user.email });

    // Ensure user.id exists and is a string
    const userId = typeof user.id === 'string' ? user.id : String(user.id);

    if (!userId || userId === 'undefined' || userId === 'null') {
      console.error('DELETE - Invalid user ID from auth:', user);
      return NextResponse.json(
        { error: 'Invalid user authentication data' },
        { status: 400 }
      );
    }

    if (!locationId || !interactionType) {
      return NextResponse.json(
        { error: 'Missing required fields: locationId and type' },
        { status: 400 }
      );
    }

    console.log('DELETE - Removing interaction:', {
      userId,
      locationId,
      interactionType
    });

    // Find the interaction to delete
    const existing = await payload.find({
      collection: 'locationInteractions',
      where: {
        user: { equals: userId },
        location: { equals: locationId },
        type: { equals: interactionType },
      },
      limit: 1,
    });

    if (existing.docs.length === 0) {
      return NextResponse.json(
        { error: 'Interaction not found' },
        { status: 404 }
      );
    }

    // Delete the interaction
    await payload.delete({
      collection: 'locationInteractions',
      id: existing.docs[0]?.id as string,
    });

    if (existing.docs[0]) {
      console.log('DELETE - Interaction deleted successfully:', existing.docs[0].id);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${interactionType} interaction`,
    });

  } catch (error) {
    console.error('Error deleting location interaction:', error);
    if (typeof error === 'object' && error !== null) {
      console.error('Error details:', {
        message: 'message' in error ? (error as any).message : 'No message',
        stack: 'stack' in error ? (error as any).stack : 'No stack',
        data: 'data' in error ? (error as any).data : 'No additional data'
      });
    }
    return NextResponse.json(
      { error: 'Failed to delete interaction' },
      { status: 500 }
    );
  }
}

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const distance = R * c; // Distance in meters
  // Round to 2 decimal places to avoid Swift JSON decoding issues
  return Math.round(distance * 100) / 100;
}

// Helper function to notify users who have saved a location about activity
async function notifyUsersAboutLocationActivity(
  locationId: string,
  activityType: string,
  interaction: any,
  payload: any
) {
  try {
    // Find all users who have saved this location
    const savedInteractions = await payload.find({
      collection: 'locationInteractions',
      where: {
        location: { equals: locationId },
        type: { equals: 'save' },
      },
    });

    // Get unique user IDs who have saved this location (excluding the current user)
    const savedByUsers = [...new Set(
      savedInteractions.docs
        .map((interaction: any) => typeof interaction.user === 'string' ? interaction.user : interaction.user?.id)
        .filter((userId: any, _idx: number, arr: any[]) => userId && userId !== arr[_idx]?.user)
    )];

    if (savedByUsers.length === 0) return;

    // Get location details for notification
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
    });

    // Create notifications for users who have saved this location
    const notificationPromises = savedByUsers.map(async (userId) => {
      let notificationMessage = '';
      let notificationType = '';
      
      switch (activityType) {
        case 'like':
          notificationMessage = `${location.name} is getting popular! Someone just liked it.`;
          notificationType = 'location_activity';
          break;
        case 'check_in':
          notificationMessage = `Someone just checked in at ${location.name}!`;
          notificationType = 'location_activity';
          break;
        case 'share':
          notificationMessage = `${location.name} is being shared around!`;
          notificationType = 'location_activity';
          break;
        default:
          notificationMessage = `There's new activity at ${location.name}!`;
          notificationType = 'location_activity';
      }

      return payload.create({
        collection: 'notifications',
        data: {
          user: userId,
          type: notificationType,
          title: 'Saved Location Activity',
          message: notificationMessage,
          isRead: false,
          metadata: {
            locationId,
            locationName: location.name,
            activityType,
            triggerUserId: interaction.user,
          },
          url: `/map?location=${locationId}`,
          priority: 'normal',
        },
      });
    });

    await Promise.all(notificationPromises);
    console.log(`Created ${notificationPromises.length} notifications for location activity: ${activityType}`);
  } catch (error) {
    console.error('Error creating location activity notifications:', error);
  }
}

// Helper function to check and notify milestones for a location
async function checkAndNotifyMilestones(
  locationId: string,
  activityType: string,
  payload: any
) {
  try {
    // Find all interactions of the given type for the location
    const interactions = await payload.find({
      collection: 'locationInteractions',
      where: {
        location: { equals: locationId },
        type: { equals: activityType },
      },
    });

    const count = interactions.docs.length;
    const milestones = [10, 25, 50, 100, 250, 500, 1000];
    
    // Check if we just hit a milestone
    if (milestones.includes(count)) {
      // Get location details
      const location = await payload.findByID({
        collection: 'locations',
        id: locationId,
      });

      // Find all users who have saved this location
      const savedInteractions = await payload.find({
        collection: 'locationInteractions',
        where: {
          location: { equals: locationId },
          type: { equals: 'save' },
        },
      });

      // Get unique user IDs who have saved this location
      const savedByUsers = [...new Set(
        savedInteractions.docs
          .map((interaction: any) => typeof interaction.user === 'string' ? interaction.user : interaction.user?.id)
          .filter((userId: any) => userId)
      )];

      if (savedByUsers.length === 0) return;

      // Create milestone notifications
      const notificationPromises = savedByUsers.map(async (userId) => {
        const activityLabel = activityType === 'check_in' ? 'check-ins' : `${activityType}s`;
        
        return payload.create({
          collection: 'notifications',
          data: {
            user: userId,
            type: 'location_milestone',
            title: '🎉 Milestone Reached!',
            message: `${location.name} just reached ${count} ${activityLabel}! It's becoming really popular.`,
            isRead: false,
            metadata: {
              locationId,
              locationName: location.name,
              milestoneType: activityType,
              milestoneCount: count,
            },
            url: `/map?location=${locationId}`,
            priority: 'high',
          },
        });
      });

      await Promise.all(notificationPromises);
      console.log(`Created ${notificationPromises.length} milestone notifications for ${location.name}: ${count} ${activityType}s`);
    }
  } catch (error) {
    console.error(`Error checking and notifying milestones for ${activityType} interactions at location ${locationId}:`, error);
  }
} 