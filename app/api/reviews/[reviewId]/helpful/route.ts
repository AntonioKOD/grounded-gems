import { NextRequest, NextResponse } from 'next/server';
import { getPayloadHMR } from '@payloadcms/next/utilities';
import config from '@payload-config';

interface PostParams {
  params: {
    reviewId: string
  }
}

// POST /api/reviews/[reviewId]/helpful - Mark review as helpful/unhelpful
export async function POST(req: NextRequest, { params }: PostParams) {
  try {
    const { reviewId } = params;
    const body = await req.json();
    const { userId, helpful } = body; // helpful: true for helpful, false for unhelpful

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (typeof helpful !== 'boolean') {
      return NextResponse.json(
        { error: 'Helpful field must be a boolean' },
        { status: 400 }
      );
    }

    const payload = await getPayloadHMR({ config });

    // Get current review
    const review = await payload.findByID({
      collection: 'reviews',
      id: reviewId,
      populate: {
        usersWhoMarkedHelpful: true,
        usersWhoMarkedUnhelpful: true
      }
    });

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Get current helpful/unhelpful users
    const helpfulUsers = review.usersWhoMarkedHelpful || [];
    const unhelpfulUsers = review.usersWhoMarkedUnhelpful || [];

    let newHelpfulUsers = [...helpfulUsers];
    let newUnhelpfulUsers = [...unhelpfulUsers];
    let newHelpfulCount = review.helpfulCount || 0;
    let newUnhelpfulCount = review.unhelpfulCount || 0;

    // Remove user from both arrays first
    newHelpfulUsers = newHelpfulUsers.filter((id: string) => id !== userId);
    newUnhelpfulUsers = newUnhelpfulUsers.filter((id: string) => id !== userId);

    // Update counts based on removal
    if (helpfulUsers.includes(userId)) {
      newHelpfulCount = Math.max(0, newHelpfulCount - 1);
    }
    if (unhelpfulUsers.includes(userId)) {
      newUnhelpfulCount = Math.max(0, newUnhelpfulCount - 1);
    }

    // Add user to appropriate array and update count
    if (helpful) {
      newHelpfulUsers.push(userId);
      newHelpfulCount += 1;
    } else {
      newUnhelpfulUsers.push(userId);
      newUnhelpfulCount += 1;
    }

    // Update review
    const updatedReview = await payload.update({
      collection: 'reviews',
      id: reviewId,
      data: {
        usersWhoMarkedHelpful: newHelpfulUsers,
        usersWhoMarkedUnhelpful: newUnhelpfulUsers,
        helpfulCount: newHelpfulCount,
        unhelpfulCount: newUnhelpfulCount
      }
    });

    return NextResponse.json({
      success: true,
      helpfulCount: newHelpfulCount,
      unhelpfulCount: newUnhelpfulCount,
      userMarkedHelpful: helpful,
      message: helpful ? 'Marked as helpful' : 'Marked as unhelpful'
    });

  } catch (error) {
    console.error('Error updating review helpfulness:', error);
    return NextResponse.json(
      { error: 'Failed to update review helpfulness' },
      { status: 500 }
    );
  }
} 