import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth-server'

// GET /api/mobile/locations/[locationId]/community-photos - List community photos for a location
export async function GET(request: NextRequest, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    const { locationId } = await params
    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    const payload = await getPayload({ config })
    
    // Get the location with community photos
    const location = await payload.findByID({ collection: 'locations', id: locationId, depth: 0 })
    const directPhotos = location.communityPhotos || []
    
    // Get approved photo submissions for this location
    const approvedSubmissions = await payload.find({
      collection: 'locationPhotoSubmissions',
      where: {
        and: [
          { location: { equals: locationId } },
          { status: { equals: 'approved' } }
        ]
      },
      depth: 2, // Include photo and user data
      sort: '-approvedAt'
    })
    
    // Convert approved submissions to community photo format
    const submissionPhotos = approvedSubmissions.docs.map((submission: any) => ({
      photoUrl: submission.photo?.url || submission.photo,
      caption: submission.caption || '',
      submittedBy: submission.submittedBy?.id || submission.submittedBy,
      submittedAt: submission.approvedAt || submission.submittedAt,
      source: 'submission',
      submissionId: submission.id,
      category: submission.category,
      featured: submission.featured || false
    }))
    
    // Combine direct photos and approved submissions
    const allPhotos = [...directPhotos, ...submissionPhotos]
    
    // Sort by submission date (newest first)
    allPhotos.sort((a: any, b: any) => {
      const dateA = new Date(a.submittedAt || a.createdAt || 0)
      const dateB = new Date(b.submittedAt || b.createdAt || 0)
      return dateB.getTime() - dateA.getTime()
    })
    
    console.log('[COMMUNITY PHOTOS] GET - Found photos:', {
      directPhotos: directPhotos.length,
      approvedSubmissions: submissionPhotos.length,
      totalPhotos: allPhotos.length
    })
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        photos: allPhotos,
        stats: {
          totalPhotos: allPhotos.length,
          directPhotos: directPhotos.length,
          approvedSubmissions: submissionPhotos.length
        }
      } 
    })
  } catch (error) {
    console.error('[COMMUNITY PHOTOS] Error in GET:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch community photos' }, { status: 500 })
  }
}

// POST /api/mobile/locations/[locationId]/community-photos - Add a community photo
export async function POST(request: NextRequest, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    console.log('[COMMUNITY PHOTOS] POST called');
    const { locationId } = await params;
    console.log('[COMMUNITY PHOTOS] locationId:', locationId);

    // Get current user using mobile authentication
    let user;
    try {
      user = await getMobileUser(request);
      console.log('[COMMUNITY PHOTOS] user:', user);
    } catch (userError) {
      console.error('[COMMUNITY PHOTOS] Error in getMobileUser:', userError);
      return NextResponse.json({ error: 'User auth error', details: userError instanceof Error ? userError.message : userError }, { status: 500 });
    }

    if (!user) {
      console.warn('[COMMUNITY PHOTOS] No user found');
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('[COMMUNITY PHOTOS] request body:', body);
    } catch (bodyError) {
      console.error('[COMMUNITY PHOTOS] Error parsing request body:', bodyError);
      return NextResponse.json({ error: 'Invalid request body', details: bodyError instanceof Error ? bodyError.message : bodyError }, { status: 400 });
    }

    const { photoUrl, caption } = body
    if (!photoUrl) {
      return NextResponse.json({ success: false, error: 'Missing photoUrl' }, { status: 400 })
    }

    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    const payload = await getPayload({ config })

    // Get current location to get existing photos
    const currentLocation = await payload.findByID({ 
      collection: 'locations', 
      id: locationId, 
      depth: 0 
    })
    
    const existingPhotos = currentLocation.communityPhotos || []
    const newPhoto = {
      photoUrl,
      caption: caption || '',
      submittedBy: user.id,
      submittedAt: new Date().toISOString()
    }

    // Add new photo to the array
    const updatedPhotos = [...existingPhotos, newPhoto]

    // Update location with new photos array
    const updated = await payload.update({
      collection: 'locations',
      id: locationId,
      data: {
        communityPhotos: updatedPhotos
      }
    })

    console.log('[COMMUNITY PHOTOS] Successfully added photo:', newPhoto);

    return NextResponse.json({ 
      success: true, 
      data: { 
        photo: newPhoto,
        totalPhotos: updatedPhotos.length
      } 
    })
  } catch (error) {
    console.error('[COMMUNITY PHOTOS] Error in POST:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to add community photo',
      details: error instanceof Error ? error.message : error 
    }, { status: 500 })
  }
} 