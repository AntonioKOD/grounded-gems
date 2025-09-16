import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config });
    
    // Check authentication
    const token = request.cookies.get('payload-token')?.value;
    if (!token) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Decode token to get user ID
    let userId: string | null = null;
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

    if (!userId) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { locationData } = await request.json();

    if (!locationData) {
      return NextResponse.json(
        { message: 'Location data is required' },
        { status: 400 }
      );
    }

    // Create the experience (location) and mark it as contest-eligible
    const experience = await payload.create({
      collection: 'experiences',
      data: {
        name: locationData.name,
        description: locationData.description,
        address: locationData.address,
        coordinates: locationData.coordinates,
        category: locationData.category,
        featuredImage: locationData.featuredImage,
        images: locationData.images || [],
        createdBy: userId,
        contestEligible: true, // Automatically make it contest-eligible
        upvotesCount: 0,
        status: 'published',
      },
    });

    // Get user information for email
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    });

    // Send confirmation email
    try {
      await sendContestConfirmationEmail({
        userEmail: user.email,
        userName: user.name || user.username,
        locationName: locationData.name,
        locationDescription: locationData.description,
        contestUrl: 'https://vote.sacavia.com',
      });
    } catch (emailError) {
      console.error('Failed to send contest confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      experienceId: experience.id,
      message: 'Location successfully added to contest',
    });

  } catch (error) {
    console.error('Error adding location to contest:', error);
    return NextResponse.json(
      { message: 'Failed to add location to contest' },
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
      - Prize Pool: $5,000
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
