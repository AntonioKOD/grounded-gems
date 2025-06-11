import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

// Photo quality assessment function
async function assessPhotoQuality(mediaDoc: any): Promise<{
  overallScore: number;
  resolution: { width: number; height: number; score: number };
  fileSize: { bytes: number; score: number };
  format: { type: string; score: number };
  blur: { detected: boolean; confidence: number; score: number };
}> {
  const width = mediaDoc.width || 0;
  const height = mediaDoc.height || 0;
  const fileSize = mediaDoc.filesize || 0;
  const mimeType = mediaDoc.mimeType || '';

  // Resolution scoring (minimum 800x600 for good score)
  const resolutionScore = Math.min(100, Math.max(0, 
    ((width * height) / (800 * 600)) * 60 + 
    (width >= 1200 && height >= 800 ? 40 : 0)
  ));

  // File size scoring (optimal range: 500KB - 5MB)
  let fileSizeScore = 100;
  if (fileSize < 100000) fileSizeScore = 20; // Too small
  else if (fileSize < 500000) fileSizeScore = 60; // Below optimal
  else if (fileSize > 10000000) fileSizeScore = 40; // Too large
  else if (fileSize > 5000000) fileSizeScore = 80; // Large but acceptable

  // Format scoring
  const formatScore = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 100 :
                     mimeType.includes('png') ? 90 :
                     mimeType.includes('webp') ? 85 : 50;

  // Blur detection (simplified - in production you'd use AI/ML service)
  const blurDetected = false; // Placeholder
  const blurConfidence = 0;
  const blurScore = blurDetected ? Math.max(0, 100 - blurConfidence) : 100;

  const overallScore = Math.round(
    (resolutionScore * 0.3) + 
    (fileSizeScore * 0.2) + 
    (formatScore * 0.2) + 
    (blurScore * 0.3)
  );

  return {
    overallScore,
    resolution: { width, height, score: resolutionScore },
    fileSize: { bytes: fileSize, score: fileSizeScore },
    format: { type: mimeType, score: formatScore },
    blur: { detected: blurDetected, confidence: blurConfidence, score: blurScore },
  };
}

// GET /api/locations/[id]/photo-submissions - Get photo submissions for a location
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    const payload = await getPayload({ config });

    // Get user from session
    const { user } = await payload.auth({ headers: req.headers });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Build query
    const where: any = { location: { equals: locationId } };
    
    if (status) {
      where.status = { equals: status };
    }

    // Users can only see their own submissions unless they're admin/moderator
    if (user.role !== 'admin' && user.role !== 'moderator') {
      where.submittedBy = { equals: user.id };
    }

    const submissions = await payload.find({
      collection: 'locationPhotoSubmissions',
      where,
      limit,
      page,
      sort: '-submittedAt',
      depth: 2, // Include related photo and user data
    });

    return NextResponse.json({
      success: true,
      submissions: submissions.docs,
      pagination: {
        page: submissions.page,
        limit: submissions.limit,
        totalPages: submissions.totalPages,
        totalDocs: submissions.totalDocs,
      },
    });

  } catch (error) {
    console.error('Error fetching photo submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photo submissions' },
      { status: 500 }
    );
  }
}

// POST /api/locations/[id]/photo-submissions - Submit a photo for a location
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params;
    const body = await req.json();
    const { photoId, caption, category, tags } = body;

    const payload = await getPayload({ config });

    // Get user from session
    const { user } = await payload.auth({ headers: req.headers });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!photoId || !category) {
      return NextResponse.json(
        { error: 'Photo ID and category are required' },
        { status: 400 }
      );
    }

    // Verify location exists
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

    // Verify photo exists and get metadata
    const photo = await payload.findByID({
      collection: 'media',
      id: photoId,
    });

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    // Check if user has already submitted this photo for this location
    const existingSubmission = await payload.find({
      collection: 'locationPhotoSubmissions',
      where: {
        and: [
          { location: { equals: locationId } },
          { photo: { equals: photoId } },
          { submittedBy: { equals: user.id } },
        ]
      },
      limit: 1,
    });

    if (existingSubmission.docs.length > 0) {
      return NextResponse.json(
        { error: 'You have already submitted this photo for this location' },
        { status: 400 }
      );
    }

    // Assess photo quality
    const qualityAssessment = await assessPhotoQuality(photo);

    // Determine initial status based on quality score
    let initialStatus = 'pending';
    if (qualityAssessment.overallScore >= 80) {
      initialStatus = 'reviewing'; // High quality photos fast-track to review
    } else if (qualityAssessment.overallScore < 40) {
      initialStatus = 'needs_improvement'; // Very low quality photos need improvement
    }

    // Create the submission
    const submission = await payload.create({
      collection: 'locationPhotoSubmissions',
      data: {
        location: locationId,
        submittedBy: user.id,
        photo: photoId,
        caption: caption || '',
        category,
        status: initialStatus,
        qualityScore: qualityAssessment.overallScore,
        autoQualityChecks: qualityAssessment,
        tags: tags ? tags.map((tag: string) => ({ tag })) : [],
        submittedAt: new Date().toISOString(),
      },
    });

    // If auto-approved (very high quality from trusted users), update status
    if (qualityAssessment.overallScore >= 90 && user.role === 'trusted') {
      await payload.update({
        collection: 'locationPhotoSubmissions',
        id: submission.id,
        data: {
          status: 'approved',
          reviewedBy: user.id,
          reviewedAt: new Date().toISOString(),
          reviewNotes: 'Auto-approved based on high quality score and trusted user status',
        },
      });
    }

    // Notify location owner about new photo submission
    if (location.createdBy && location.createdBy !== user.id) {
      try {
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: typeof location.createdBy === 'string' ? location.createdBy : location.createdBy.id,
            type: 'photo_submission',
            title: 'New Photo Submission',
            message: `${user.name || 'Someone'} submitted a photo for ${location.name}`,
            actionBy: user.id,
            priority: 'normal',
            relatedTo: {
              relationTo: 'locations',
              value: locationId,
            },
            metadata: {
              locationName: location.name,
              submissionId: submission.id,
              category,
              qualityScore: qualityAssessment.overallScore,
            },
            read: false,
          },
        });
      } catch (error) {
        console.error('Error creating notification:', error);
      }
    }

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        status: submission.status,
        qualityScore: qualityAssessment.overallScore,
        message: initialStatus === 'reviewing' 
          ? 'Your high-quality photo has been submitted for review!'
          : initialStatus === 'needs_improvement'
          ? 'Your photo needs some improvements. Please check our photo guidelines.'
          : 'Your photo has been submitted and is pending review.',
      },
    });

  } catch (error) {
    console.error('Error submitting photo:', error);
    return NextResponse.json(
      { error: 'Failed to submit photo' },
      { status: 500 }
    );
  }
}

// PATCH /api/locations/[id]/photo-submissions/[submissionId] - Review/update a photo submission
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    const { submissionId } = await params;
    const body = await req.json();
    const { status, rejectionReason, rejectionFeedback, reviewNotes, featured } = body;

    const payload = await getPayload({ config });

    // Get user from session
    const { user } = await payload.auth({ headers: req.headers });
    
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      return NextResponse.json(
        { error: 'Admin or moderator access required' },
        { status: 403 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'reviewing', 'approved', 'rejected', 'needs_improvement'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {
      reviewedBy: user.id,
      reviewedAt: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (rejectionReason) updateData.rejectionReason = rejectionReason;
    if (rejectionFeedback) updateData.rejectionFeedback = rejectionFeedback;
    if (reviewNotes) updateData.reviewNotes = reviewNotes;
    if (featured !== undefined) updateData.featured = featured;

    if (status === 'approved') {
      updateData.approvedAt = new Date().toISOString();
    }

    // Update the submission
    const updatedSubmission = await payload.update({
      collection: 'locationPhotoSubmissions',
      id: submissionId,
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      message: `Photo submission ${status || 'updated'} successfully`,
    });

  } catch (error) {
    console.error('Error updating photo submission:', error);
    return NextResponse.json(
      { error: 'Failed to update photo submission' },
      { status: 500 }
    );
  }
} 