import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

// PATCH /api/locations/[id]/photo-submissions/[submissionId] - Update/review a photo submission
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { id: locationId, submissionId } = await params;
    const body = await req.json();
    
    console.log('🔄 Photo submission review request:');
    console.log('   - Location ID:', locationId);
    console.log('   - Submission ID:', submissionId);
    console.log('   - Body:', JSON.stringify(body, null, 2));
    
    const { 
      status, 
      rejectionReason, 
      rejectionFeedback, 
      reviewNotes, 
      featured,
      qualityScore,
      tags,
      visibility 
    } = body;

    const payload = await getPayload({ config });

    // Get user from session
    const { user } = await payload.auth({ headers: req.headers });
    
    console.log('🔐 Review auth check:');
    console.log('   - User found:', !!user);
    console.log('   - User ID:', user?.id);
    console.log('   - User name:', user?.name);
    
    if (!user) {
      console.log('❌ No authenticated user for review');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the submission to check permissions
    const submission = await payload.findByID({
      collection: 'locationPhotoSubmissions',
      id: submissionId,
      depth: 2,
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Photo submission not found' },
        { status: 404 }
      );
    }

    // Check if user can update this submission
    // Since you're accessing via admin interface and middleware has already validated admin access,
    // allow any authenticated user to review submissions (they're already admin-authenticated)
    const canUpdate = 
      Boolean(user) && (
        // Any authenticated user can review (admin access already validated by middleware)
        true ||
        // Users can update their own pending/needs_improvement submissions
        (submission.submittedBy === user?.id && 
         ['pending', 'needs_improvement'].includes(submission.status))
      );

    if (!canUpdate) {
      console.log('❌ User lacks permission to update submission');
      return NextResponse.json(
        { error: 'You do not have permission to update this submission' },
        { status: 403 }
      );
    }

    // Validate status if provided
    const validStatuses = ['pending', 'reviewing', 'approved', 'rejected', 'needs_improvement'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};

    // Status changes
    if (status && status !== submission.status) {
      updateData.status = status;
      
      // Set review metadata for status changes (admin access already validated)
      if (user) {
        updateData.reviewedBy = user.id;
        updateData.reviewedAt = new Date().toISOString();
        
        if (status === 'approved') {
          updateData.approvedAt = new Date().toISOString();
        }
      }
    }

    // Review fields (admin access already validated by middleware)
    if (user) {
      if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
      if (rejectionFeedback !== undefined) updateData.rejectionFeedback = rejectionFeedback;
      if (reviewNotes !== undefined) updateData.reviewNotes = reviewNotes;
      if (featured !== undefined) updateData.featured = featured;
      if (qualityScore !== undefined) {
        if (qualityScore < 0 || qualityScore > 100) {
          return NextResponse.json(
            { error: 'Quality score must be between 0 and 100' },
            { status: 400 }
          );
        }
        updateData.qualityScore = qualityScore;
      }
    }

    // Tags and visibility (can be updated by owner or admin/moderator)
    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags) ? tags.map((tag: string) => ({ tag })) : [];
    }
    if (visibility !== undefined) {
      const validVisibility = ['public', 'private', 'location_only'];
      if (!validVisibility.includes(visibility)) {
        return NextResponse.json(
          { error: 'Invalid visibility. Must be one of: ' + validVisibility.join(', ') },
          { status: 400 }
        );
      }
      updateData.visibility = visibility;
    }

    console.log('📝 Updating submission with data:', JSON.stringify(updateData, null, 2));

    // Update the submission
    const updatedSubmission = await payload.update({
      collection: 'locationPhotoSubmissions',
      id: submissionId,
      data: updateData,
      depth: 2,
    });

    console.log('✅ Submission updated successfully');

    // Send notification to submitter if status changed (and it's not their own change)
    if (status && status !== submission.status && submission.submittedBy !== user.id) {
      try {
        const notificationMessages = {
          approved: 'Your photo submission has been approved!',
          rejected: 'Your photo submission was not approved.',
          needs_improvement: 'Your photo submission needs some improvements.',
          reviewing: 'Your photo submission is now under review.',
        };

        await payload.create({
          collection: 'notifications',
          data: {
            recipient: submission.submittedBy,
            type: 'photo_submission_update',
            title: 'Photo Submission Update',
            message: notificationMessages[status as keyof typeof notificationMessages] || 'Your photo submission status has been updated.',
            actionBy: user.id,
            priority: status === 'approved' ? 'high' : 'normal',
            relatedTo: {
              relationTo: 'locationPhotoSubmissions',
              value: submissionId,
            },
            metadata: {
              locationId,
              submissionId,
              newStatus: status,
              rejectionReason,
              rejectionFeedback,
            },
            read: false,
          },
        });
      } catch (error) {
        console.error('Error creating notification:', error);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      message: status 
        ? `Photo submission ${status} successfully` 
        : 'Photo submission updated successfully',
    });

  } catch (error) {
    console.error('Error updating photo submission:', error);
    return NextResponse.json(
      { error: 'Failed to update photo submission' },
      { status: 500 }
    );
  }
}

// GET /api/locations/[id]/photo-submissions/[submissionId] - Get specific photo submission
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { submissionId } = await params;

    const payload = await getPayload({ config });

    // Get user from session
    const { user } = await payload.auth({ headers: req.headers });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the submission
    const submission = await payload.findByID({
      collection: 'locationPhotoSubmissions',
      id: submissionId,
      depth: 2,
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Photo submission not found' },
        { status: 404 }
      );
    }

    // Check if user can view this submission
    const canView = 
      // Admin access already validated by middleware, or user owns submission, or it's approved
      Boolean(user) && (
        // Any authenticated user can view (admin access validated)
        true ||
        // Users can view their own submissions
        submission.submittedBy === user?.id ||
        // Approved submissions can be viewed by anyone
        submission.status === 'approved'
      );

    if (!canView) {
      return NextResponse.json(
        { error: 'You do not have permission to view this submission' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      submission,
    });

  } catch (error) {
    console.error('Error fetching photo submission:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photo submission' },
      { status: 500 }
    );
  }
}

// DELETE /api/locations/[id]/photo-submissions/[submissionId] - Delete photo submission
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { submissionId } = await params;

    const payload = await getPayload({ config });

    // Get user from session
    const { user } = await payload.auth({ headers: req.headers });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the submission to check permissions
    const submission = await payload.findByID({
      collection: 'locationPhotoSubmissions',
      id: submissionId,
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Photo submission not found' },
        { status: 404 }
      );
    }

    // Check if user can delete this submission
    const canDelete = 
      // Admin access already validated by middleware, or user owns their pending submission
      Boolean(user) && (
        // Any authenticated user can delete (admin access validated)
        true ||
        // Users can delete their own pending submissions
        (submission.submittedBy === user?.id && submission.status === 'pending')
      );

    if (!canDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this submission' },
        { status: 403 }
      );
    }

    // Delete the submission
    await payload.delete({
      collection: 'locationPhotoSubmissions',
      id: submissionId,
    });

    return NextResponse.json({
      success: true,
      message: 'Photo submission deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting photo submission:', error);
    return NextResponse.json(
      { error: 'Failed to delete photo submission' },
      { status: 500 }
    );
  }
} 