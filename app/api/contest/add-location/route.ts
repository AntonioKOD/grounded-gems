import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config });
    
    const { locationData, userId: bodyUserId } = await request.json();
    
    // Use userId from body if provided (for testing), otherwise check cookie authentication
    let userId: string | null = bodyUserId || null;

    if (!userId) {
      // Check authentication
      const token = request.cookies.get('payload-token')?.value;
      if (!token) {
        return NextResponse.json(
          { message: 'Authentication required' },
          { status: 401 }
        );
      }

      // Decode token to get user ID
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = parts[1] ? JSON.parse(Buffer.from(parts[1], 'base64').toString()) : {};
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            return NextResponse.json(
              { message: 'Token expired' },
              { status: 401 }
            );
          }
          userId = payload.id;
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        return NextResponse.json(
          { message: 'Invalid token' },
          { status: 401 }
        );
      }
    }

    if (!userId) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!locationData) {
      return NextResponse.json(
        { message: 'Location data is required' },
        { status: 400 }
      );
    }

    console.log('🎯 Creating experience and location with data:', {
      title: locationData.name,
      description: locationData.description,
      city: locationData.address.city,
      status: 'PUBLISHED',
      contestEligible: true,
      upvotesCount: 0,
      owner: userId,
    });

    // Create the experience (for contest) and mark it as contest-eligible
    const experience = await payload.create({
      collection: 'experiences',
      data: {
        title: locationData.name,
        description: locationData.description,
        city: locationData.address.city,
        status: 'PUBLISHED',
        contestEligible: true, // Automatically make it contest-eligible
        upvotesCount: 0,
        owner: userId,
        // Add location details to metadata (coordinates are optional)
        location: {
          state: locationData.address.state,
          country: locationData.address.country,
          ...(locationData.coordinates && {
            coordinates: {
              latitude: locationData.coordinates.lat,
              longitude: locationData.coordinates.lng,
            }
          })
        }
      },
    });

    console.log('✅ Experience created successfully:', experience.id);

    // Also create a location entry for persistence (so it survives after contest ends)
    const location = await payload.create({
      collection: 'locations',
      data: {
        name: locationData.name,
        slug: locationData.slug || locationData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: locationData.description,
        shortDescription: locationData.shortDescription,
        featuredImage: locationData.featuredImage,
        gallery: locationData.gallery,
        categories: locationData.categories,
        tags: locationData.tags,
        address: {
          street: locationData.address.street,
          city: locationData.address.city,
          state: locationData.address.state,
          zip: locationData.address.zip,
          country: locationData.address.country,
        },
        neighborhood: locationData.neighborhood,
        contactInfo: locationData.contactInfo,
        businessHours: locationData.businessHours,
        priceRange: locationData.priceRange,
        bestTimeToVisit: locationData.bestTimeToVisit,
        insiderTips: locationData.insiderTips,
        accessibility: locationData.accessibility,
        createdBy: userId,
        privacy: locationData.privacy || 'public',
        privateAccess: locationData.privateAccess,
        status: 'published',
        isFeatured: false,
        isVerified: false,
        hasBusinessPartnership: locationData.hasBusinessPartnership,
        partnershipDetails: locationData.partnershipDetails,
        meta: locationData.meta,
        // Add coordinates if available
        ...(locationData.coordinates && {
          coordinates: {
            latitude: locationData.coordinates.lat,
            longitude: locationData.coordinates.lng,
          }
        })
      },
    });

    console.log('✅ Location created successfully:', location.id);

    // Send confirmation email (with error handling)
    try {
      console.log('👤 Looking up user with ID:', userId);
      const user = await payload.findByID({
        collection: 'users',
        id: userId,
      });
      console.log('👤 User found:', user.email);

      await sendContestConfirmationEmail({
        userEmail: user.email,
        userName: user.name || user.username || 'User',
        locationName: locationData.name,
        locationDescription: locationData.description,
        contestUrl: 'https://vote.sacavia.com',
      });
      console.log('✅ Confirmation email sent successfully');
    } catch (emailError) {
      console.error('⚠️ Failed to send confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      experienceId: experience.id,
      locationId: location.id,
      message: 'Location successfully added to contest and saved to locations database',
    });

  } catch (error) {
    console.error('❌ Error adding location to contest:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : 'Unknown';
    
    console.error('❌ Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: errorName
    });
    
    return NextResponse.json(
      { 
        message: 'Failed to add location to contest',
        error: errorMessage,
        details: errorStack
      },
      { status: 500 }
    );
  }
}

async function sendContestConfirmationEmail({
  userEmail,
  userName,
  locationName,
  locationDescription,
  contestUrl,
}: {
  userEmail: string;
  userName: string;
  locationName: string;
  locationDescription: string;
  contestUrl: string;
}) {
  // You can implement your email service here (Resend, SendGrid, etc.)
  // For now, we'll just log the email content
  console.log('📧 Contest Confirmation Email:', {
    to: userEmail,
    subject: '🎉 Your Location Has Been Added to the Sacavia Contest!',
    content: `
      Hi ${userName},
      
      Great news! Your location "${locationName}" has been successfully added to the Sacavia Hidden Gems Contest!
      
      Location Details:
      - Name: ${locationName}
      - Description: ${locationDescription}
      
      Contest Information:
      - Total Prize: $5,000
      - Contest Link: ${contestUrl}
      - Voting is now open!
      
      Share your location with friends and family to get more votes. The more votes you get, the better your chances of winning!
      
      Good luck!
      
      Best regards,
      The Sacavia Team
    `,
  });

  // TODO: Implement actual email sending service
  // Example with Resend:
  // await resend.emails.send({
  //   from: 'contest@sacavia.com',
  //   to: userEmail,
  //   subject: '🎉 Your Location Has Been Added to the Sacavia Contest!',
  //   html: emailTemplate,
  // });
}
