import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { sendEmail, eventRequestEmailTemplate } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    // Debug: Log the raw request
    const body = await req.text();
    console.log('Raw request body:', body);
    
    // Parse the JSON
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      console.error('JSON parse error:', e);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    console.log('Parsed request body:', parsedBody);

    const {
      eventTitle,
      eventDescription,
      eventType,
      locationId,
      requestedDate,
      requestedTime,
      expectedAttendees,
      expectedGuests,
      specialRequests,
      contactEmail,
      budget,
      contactInfo
    } = parsedBody;

    console.log('Received event request:', {
      eventTitle,
      eventDescription,
      eventType,
      locationId,
      requestedDate,
      contactEmail
    });

    const payload = await getPayload({ config });

    // Get user from session/auth
    const { user } = await payload.auth({ headers: req.headers });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Ensure user.id exists and is a string
    const userId = typeof user.id === 'string' ? user.id : String(user.id);
    
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.error('Invalid user ID from auth:', user);
      return NextResponse.json(
        { error: 'Invalid user authentication data' },
        { status: 400 }
      );
    }

    console.log('Authenticated user:', { id: userId, email: user.email });

    // Validate required fields - only require the essentials for initial request
    const missingFields = [];
    if (!eventTitle || !eventTitle.trim()) missingFields.push('eventTitle');
    if (!eventDescription || !eventDescription.trim()) missingFields.push('eventDescription');
    if (!locationId) missingFields.push('locationId');

    // Contact email is only required if user has no email
    const finalContactEmail = contactEmail?.trim() || user.email;
    if (!finalContactEmail) missingFields.push('contactEmail');

    if (missingFields.length > 0) {
      console.error('Missing required fields:', {
        eventTitle: !!eventTitle,
        eventDescription: !!eventDescription,
        locationId: !!locationId,
        contactEmail: !!finalContactEmail,
        userEmail: !!user.email,
        receivedBody: { eventTitle, eventDescription, locationId, contactEmail }
      });
      return NextResponse.json(
        { 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields,
          received: { eventTitle: !!eventTitle, eventDescription: !!eventDescription, locationId: !!locationId, contactEmail: !!finalContactEmail }
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(finalContactEmail)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Validate location exists
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    console.log('Found location:', { id: location.id, name: location.name });

    // Determine if location accepts event requests vs allows direct event creation
    const locationCategories = location.categories?.map((cat: { name: string } | string) => 
      typeof cat === 'string' ? cat : cat.name
    ) || [];

    console.log('Location categories:', locationCategories);

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

    console.log('Venue type analysis:', { isPrivateVenue, isPublicSpace, categories: locationCategories });

    // If it's a public space, suggest direct event creation instead
    if (isPublicSpace && !isPrivateVenue) {
      return NextResponse.json(
        { 
          error: 'This is a public space where you can create events directly',
          suggestion: 'redirect_to_create_event',
          message: 'Public spaces like parks and beaches allow you to create events directly. Would you like to create an event instead?',
          locationId,
          locationType: 'public'
        },
        { status: 400 }
      );
    }

    // If it's not a private venue and not clearly a public space, check if it has an owner
    if (!isPrivateVenue) {
      // Check if location has an owner/creator who can approve events
      if (!location.createdBy) {
        return NextResponse.json(
          { 
            error: 'This location does not accept event requests',
            suggestion: 'contact_support',
            message: 'This location type does not currently support event requests. Please contact support if you believe this is an error.',
            locationType: 'other'
          },
          { status: 400 }
        );
      }
    }

    // Use defaults for optional fields
    const finalRequestedDate = requestedDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days from now
    const finalRequestedTime = requestedTime || '18:00'; // Default to 6 PM
    const finalEventType = eventType || 'event_request'; // Default type
    const finalExpectedAttendees = expectedAttendees ? parseInt(String(expectedAttendees)) : 10; // Default 10

    // Check if user already has a pending request for this location and date
    /* TEMPORARILY DISABLED FOR DEBUGGING
    const existingRequest = await payload.find({
      collection: 'eventRequests',
      where: {
        requestedBy: { equals: userId },
        location: { equals: locationId },
        requestedDate: { equals: finalRequestedDate },
        status: { equals: 'pending' },
      },
      limit: 1,
    });

    if (existingRequest.docs.length > 0) {
      return NextResponse.json(
        { error: 'You already have a pending request for this location on this date' },
        { status: 409 }
      );
    }
    */

    // Validate requested date is in the future (only if a specific date was provided)
    if (requestedDate) {
      const requestDate = new Date(requestedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (requestDate < today) {
        return NextResponse.json(
          { error: 'Requested date must be in the future' },
          { status: 400 }
        );
      }
    }

    // Prepare event request data
    const eventRequestData = {
      eventTitle,
      eventDescription,
      eventType: finalEventType,
      location: locationId,
      requestedBy: userId,
      requestedDate: finalRequestedDate,
      requestedTime: finalRequestedTime,
      expectedAttendees: finalExpectedAttendees,
      expectedGuests: expectedGuests ? parseInt(String(expectedGuests)) : undefined,
      specialRequests: specialRequests || '',
      contactInfo: contactInfo ? {
        phone: contactInfo.phone || user.phone || '',
        email: finalContactEmail || contactInfo.email || user.email || '',
        preferredContact: contactInfo.preferredContact || 'email',
      } : {
        phone: user.phone || '',
        email: finalContactEmail || user.email || '',
        preferredContact: 'email',
      },
      budget,
      status: 'pending',
    };

    console.log('Creating event request with data:', eventRequestData);

    // Create the event request
    const eventRequest = await payload.create({
      collection: 'eventRequests',
      data: eventRequestData,
    });

    console.log('Event request created successfully:', eventRequest.id);

    // Notify location owner if they exist
    let locationOwnerId = typeof location.createdBy === 'object' 
      ? (location.createdBy as { id: string }).id 
      : location.createdBy as string;

    console.log('Checking notification conditions:', {
      locationOwnerId,
      currentUserId: userId,
      shouldNotify: locationOwnerId && locationOwnerId !== userId
    });

    if (locationOwnerId && locationOwnerId !== userId) {
      try {
        console.log('Creating notification for location owner:', locationOwnerId);
        
        const notification = await payload.create({
          collection: 'notifications',
          data: {
            recipient: locationOwnerId,
            type: 'event_request_received',
            title: `New event request for ${location.name}`,
            message: `${user.name || 'Someone'} has requested to host "${eventTitle}" at your location on ${finalRequestedDate}.`,
            relatedTo: {
              relationTo: 'eventRequests',
              value: eventRequest.id,
            },
            actionBy: userId,
            metadata: {
              eventTitle,
              eventType: finalEventType,
              locationName: location.name,
              requestedDate: finalRequestedDate,
              requestedTime: finalRequestedTime,
              expectedAttendees: finalExpectedAttendees,
              expectedGuests: expectedGuests ? parseInt(String(expectedGuests)) : undefined,
            },
            priority: 'high',
            read: false,
          },
        });
        
        console.log('Notification created successfully:', notification.id);

        // Send email notification to location owner
        try {
          const locationOwner = await payload.findByID({
            collection: 'users',
            id: locationOwnerId,
            select: {
              name: true,
              email: true,
            },
          });

          if (locationOwner?.email) {
            const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile/${locationOwnerId}/location-dashboard`;
            
            const emailTemplate = eventRequestEmailTemplate.toOwner({
              ownerName: locationOwner.name || 'Location Owner',
              requesterName: user.name || 'Someone',
              eventTitle,
              locationName: location.name,
              eventDescription,
              contactEmail: eventRequestData.contactInfo.email,
              dashboardUrl,
            });

            await sendEmail({
              to: locationOwner.email,
              subject: emailTemplate.subject,
              html: emailTemplate.html,
            });

            console.log('Email notification sent to location owner:', locationOwner.email);
          }
        } catch (emailError) {
          console.error('Error sending email to location owner:', emailError);
          // Don't fail the request if email fails
        }
      } catch (notificationError) {
        console.error('Error creating notification for location owner:', notificationError);
        // Don't fail the request if notification fails
      }
    } else {
      console.log('No notification sent:', locationOwnerId ? 'Location owner is the same as requester' : 'No location owner found');
    }

    return NextResponse.json({
      success: true,
      eventRequest,
      message: 'Event request submitted successfully. The location owner will be notified.',
    });

  } catch (error) {
    console.error('Error creating event request:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      data: error.data || 'No additional data'
    });
    return NextResponse.json(
      { error: 'Failed to create event request' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const { searchParams } = new URL(req.url);
    
    const locationId = searchParams.get('locationId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    // Get user from session/auth
    const { user } = await payload.auth({ headers: req.headers });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const where: any = {};
    
    // User can see their own requests or requests for locations they own
    where.or = [
      { requestedBy: { equals: user.id } },
    ];

    // If user owns locations, add those to the query
    const userLocations = await payload.find({
      collection: 'locations',
      where: {
        createdBy: { equals: user.id },
      },
      select: {
        id: true,
      },
    });

    if (userLocations.docs.length > 0) {
      const locationIds = userLocations.docs.map(loc => loc.id);
      where.or.push({
        location: { in: locationIds },
      });
    }

    if (locationId) {
      where.location = { equals: locationId };
    }

    if (status) {
      where.status = { equals: status };
    }

    const eventRequests = await payload.find({
      collection: 'eventRequests',
      where,
      limit,
      page,
      sort: '-createdAt',
      populate: {
        requestedBy: {
          select: {
            name: true,
            email: true,
            profileImage: true,
          },
        },
        location: {
          select: {
            name: true,
            address: true,
            featuredImage: true,
            createdBy: true,
          },
        },
        reviewedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      eventRequests: eventRequests.docs,
      pagination: {
        totalDocs: eventRequests.totalDocs,
        totalPages: eventRequests.totalPages,
        page: eventRequests.page,
        limit: eventRequests.limit,
        hasNextPage: eventRequests.hasNextPage,
        hasPrevPage: eventRequests.hasPrevPage,
      },
    });

  } catch (error) {
    console.error('Error fetching event requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event requests' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const payload = await getPayload({ config });
    const body = await req.json();
    
    const { requestId, status, denialReason, approvalNotes } = body;

    // Get user from session/auth
    const { user } = await payload.auth({ headers: req.headers });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!requestId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: requestId and status' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['approved', 'denied', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: approved, denied, or cancelled' },
        { status: 400 }
      );
    }

    // Get the event request with proper population
    const eventRequest = await payload.findByID({
      collection: 'eventRequests',
      id: requestId,
      populate: {
        requestedBy: {
          select: {
            id: true,
          },
        },
        location: {
          select: {
            id: true,
            createdBy: true,
            name: true,
          },
        },
      },
    });

    if (!eventRequest) {
      return NextResponse.json(
        { error: 'Event request not found' },
        { status: 404 }
      );
    }

    // Extract IDs properly
    const requestedById = typeof eventRequest.requestedBy === 'object' 
      ? eventRequest.requestedBy.id 
      : eventRequest.requestedBy;
    
    const locationCreatedById = typeof eventRequest.location.createdBy === 'object'
      ? eventRequest.location.createdBy.id
      : eventRequest.location.createdBy;

    console.log('Permission check:', {
      userId: user.id,
      requestedById,
      locationCreatedById,
      canCancel: user.id === requestedById,
      canApprove: user.id === locationCreatedById
    });

    // Check permissions
    const canUpdate = 
      user.id === requestedById || // User can cancel their own request
      user.id === locationCreatedById; // Location owner can approve/deny

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'You do not have permission to update this request' },
        { status: 403 }
      );
    }

    // Additional validation for denial
    if (status === 'denied' && !denialReason) {
      return NextResponse.json(
        { error: 'Denial reason is required when denying a request' },
        { status: 400 }
      );
    }

    // Update the event request
    const updateData: any = {
      status,
      reviewedBy: user.id,
      reviewedAt: new Date().toISOString(),
    };

    if (status === 'denied' && denialReason) {
      updateData.denialReason = denialReason;
    }

    if (status === 'approved' && approvalNotes) {
      updateData.approvalNotes = approvalNotes;
    }

    const updatedRequest = await payload.update({
      collection: 'eventRequests',
      id: requestId,
      data: updateData,
    });

    // Create notification for the requester about the decision
    if (requestedById && requestedById !== user.id) {
      try {
        let notificationTitle = '';
        let notificationMessage = '';
        let notificationType = 'event_request_response';

        if (status === 'approved') {
          notificationTitle = `Event request approved!`;
          notificationMessage = `Great news! Your event request "${eventRequest.eventTitle}" for ${eventRequest.location.name} has been approved.${approvalNotes ? ` Note: ${approvalNotes}` : ''} You can now create your event and invite guests.`;
        } else if (status === 'denied') {
          notificationTitle = `Event request declined`;
          notificationMessage = `Your event request "${eventRequest.eventTitle}" for ${eventRequest.location.name} has been declined.${denialReason ? ` Reason: ${denialReason}` : ''} Feel free to contact the location directly for more information.`;
        }

        if (notificationTitle) {
          const notification = await payload.create({
            collection: 'notifications',
            data: {
              recipient: requestedById,
              type: notificationType,
              title: notificationTitle,
              message: notificationMessage,
              relatedTo: {
                relationTo: 'eventRequests',
                value: requestId,
              },
              actionBy: user.id,
              metadata: {
                eventTitle: eventRequest.eventTitle,
                locationName: eventRequest.location.name,
                requestStatus: status,
                requestId: requestId,
                ...(status === 'approved' && { 
                  canCreateEvent: true,
                  locationId: eventRequest.location.id 
                }),
              },
              priority: status === 'approved' ? 'high' : 'normal',
              read: false,
            },
          });
          
          console.log('Decision notification created for requester:', notification.id);

          // Send email notification to requester
          try {
            const requester = await payload.findByID({
              collection: 'users',
              id: requestedById,
              select: {
                name: true,
                email: true,
              },
            });

            const locationOwner = await payload.findByID({
              collection: 'users',
              id: user.id,
              select: {
                email: true,
              },
            });

            if (requester?.email && locationOwner?.email) {
              let emailTemplate;
              
              if (status === 'approved') {
                const createEventUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/create?locationId=${eventRequest.location.id}&approved=true&requestId=${requestId}`;
                
                emailTemplate = eventRequestEmailTemplate.approvalNotification({
                  requesterName: requester.name || 'User',
                  eventTitle: eventRequest.eventTitle,
                  locationName: eventRequest.location.name,
                  ownerEmail: locationOwner.email,
                  createEventUrl,
                  approvalNotes,
                });
              } else if (status === 'denied') {
                emailTemplate = eventRequestEmailTemplate.denialNotification({
                  requesterName: requester.name || 'User',
                  eventTitle: eventRequest.eventTitle,
                  locationName: eventRequest.location.name,
                  ownerEmail: locationOwner.email,
                  denialReason,
                });
              }

              if (emailTemplate) {
                await sendEmail({
                  to: requester.email,
                  subject: emailTemplate.subject,
                  html: emailTemplate.html,
                });

                console.log('Email notification sent to requester:', requester.email);
              }
            }
          } catch (emailError) {
            console.error('Error sending email to requester:', emailError);
            // Don't fail the request if email fails
          }
        }
      } catch (notificationError) {
        console.error('Error creating decision notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      eventRequest: updatedRequest,
      message: `Event request ${status} successfully`,
    });

  } catch (error) {
    console.error('Error updating event request:', error);
    return NextResponse.json(
      { error: 'Failed to update event request' },
      { status: 500 }
    );
  }
} 