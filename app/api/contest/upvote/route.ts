import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Upvote request schema
const upvoteSchema = z.object({
  experienceId: z.string().min(1),
  userId: z.string().min(1),
});

// Upvote response interface
interface UpvoteResponse {
  success: boolean;
  upvoted: boolean;
  upvotesCount: number;
  message?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = upvoteSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const { experienceId, userId } = validation.data;

    console.log('👍 Upvote request:', { experienceId, userId });

    // Initialize PayloadCMS
    const payload = await getPayload({ config });

    // Check if the experience exists and is contest eligible
    const experience = await payload.findByID({
      collection: 'experiences',
      id: experienceId,
    });

    if (!experience) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Experience not found' 
        },
        { status: 404 }
      );
    }

    if (!experience.contestEligible || experience.status !== 'PUBLISHED') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Experience is not eligible for contest voting' 
        },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    });

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not found' 
        },
        { status: 404 }
      );
    }

    // Check if user has already upvoted this experience
    const existingUpvote = await payload.find({
      collection: 'contest-upvotes',
      where: {
        and: [
          { experience: { equals: experienceId } },
          { user: { equals: userId } }
        ]
      },
      limit: 1,
    });

    let upvoted = false;
    let upvotesCount = 0;

    if (existingUpvote.docs.length > 0) {
      // User has already upvoted, remove the upvote (toggle off)
      const upvote = existingUpvote.docs[0];
      if (upvote && upvote.id) {
        await payload.delete({
          collection: 'contest-upvotes',
          id: upvote.id,
        });

        console.log('👎 Upvote removed for experience:', experienceId);
        upvoted = false;
      } else {
        console.warn('⚠️  Upvote document found but missing ID:', upvote);
        upvoted = false;
      }
    } else {
      // User hasn't upvoted, create new upvote
      await payload.create({
        collection: 'contest-upvotes',
        data: {
          experience: experienceId,
          user: userId,
          createdAt: new Date().toISOString(),
        },
      });

      console.log('👍 Upvote created for experience:', experienceId);
      upvoted = true;
    }

    // Get updated upvotes count
    const upvotesResult = await payload.find({
      collection: 'contest-upvotes',
      where: {
        experience: { equals: experienceId }
      },
      limit: 0, // Just get count
    });

    upvotesCount = upvotesResult.totalDocs;

    // Update the experience with the new upvotes count
    await payload.update({
      collection: 'experiences',
      id: experienceId,
      data: {
        upvotesCount: upvotesCount,
      },
    });

    // Create notification for the experience owner (if it's an upvote)
    if (upvoted && experience.owner && experience.owner.id !== userId) {
      try {
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: experience.owner.id,
            type: 'contest_upvote',
            title: 'New Contest Upvote! 🎉',
            message: `Your experience "${experience.title}" received an upvote in the contest!`,
            relatedTo: {
              relationTo: 'experiences',
              value: experienceId,
            },
            createdAt: new Date().toISOString(),
          },
        });
      } catch (notificationError) {
        console.warn('Failed to create upvote notification:', notificationError);
        // Don't fail the upvote if notification fails
      }
    }

    const response: UpvoteResponse = {
      success: true,
      upvoted,
      upvotesCount,
      message: upvoted ? 'Experience upvoted successfully!' : 'Upvote removed successfully!',
    };

    console.log('✅ Upvote processed:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Upvote error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process upvote',
        details: errorMessage,
        upvoted: false,
        upvotesCount: 0,
      },
      { status: 500 }
    );
  }
}

// GET method to check upvote status and count
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const experienceId = searchParams.get('experienceId');
    const userId = searchParams.get('userId');

    if (!experienceId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Experience ID is required' 
        },
        { status: 400 }
      );
    }

    console.log('🔍 Checking upvote status:', { experienceId, userId });

    // Initialize PayloadCMS
    const payload = await getPayload({ config });

    // Get upvotes count for the experience
    const upvotesResult = await payload.find({
      collection: 'contest-upvotes',
      where: {
        experience: { equals: experienceId }
      },
      limit: 0, // Just get count
    });

    const upvotesCount = upvotesResult.totalDocs;

    let userUpvoted = false;
    
    // Check if specific user has upvoted (if userId provided)
    if (userId) {
      const userUpvote = await payload.find({
        collection: 'contest-upvotes',
        where: {
          and: [
            { experience: { equals: experienceId } },
            { user: { equals: userId } }
          ]
        },
        limit: 1,
      });

      userUpvoted = userUpvote.docs.length > 0;
    }

    return NextResponse.json({
      success: true,
      experienceId,
      upvotesCount,
      userUpvoted,
      message: 'Upvote status retrieved successfully',
    });

  } catch (error) {
    console.error('❌ Upvote status check error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check upvote status',
        details: errorMessage,
        upvotesCount: 0,
        userUpvoted: false,
      },
      { status: 500 }
    );
  }
}
