import { NextRequest, NextResponse } from "next/server"
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/locations/[id]/community-photos - Get approved community photos for a location
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    const payload = await getPayload({ config });

    // Build query for approved photos only
    const where = { 
      and: [
        { location: { equals: locationId } },
        { status: { equals: 'approved' } }
      ]
    };

    const submissions = await payload.find({
      collection: 'locationPhotoSubmissions',
      where,
      limit,
      page,
      sort: '-submittedAt',
      depth: 2, // Include related photo and user data
    });

    // Transform the data to include photo URLs and user info
    const communityPhotos = submissions.docs.map((submission: any) => ({
      id: submission.id,
      photoUrl: submission.photo?.url || submission.photo,
      caption: submission.caption,
      category: submission.category,
      tags: submission.tags || [],
      submittedBy: {
        id: submission.submittedBy?.id || submission.submittedBy,
        name: submission.submittedBy?.name || 'Anonymous',
        avatar: submission.submittedBy?.profileImage?.url || null,
      },
      submittedAt: submission.submittedAt,
      qualityScore: submission.qualityScore,
      featured: submission.featured || false,
    }));

    return NextResponse.json({
      success: true,
      photos: communityPhotos,
      pagination: {
        page: submissions.page,
        limit: submissions.limit,
        totalPages: submissions.totalPages,
        totalDocs: submissions.totalDocs,
      },
    });

  } catch (error) {
    console.error('Error fetching community photos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch community photos' },
      { status: 500 }
    );
  }
} 