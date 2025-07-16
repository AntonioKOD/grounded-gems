import { NextRequest, NextResponse } from 'next/server'
import { getServerSideUser } from '@/lib/auth-server'

// GET /api/mobile/locations/[locationId]/community-photos - List community photos for a location
export async function GET(request: NextRequest, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    const { locationId } = await params
    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    const payload = await getPayload({ config })
    const location = await payload.findByID({ collection: 'locations', id: locationId, depth: 0 })
    const photos = location.communityPhotos || []
    return NextResponse.json({ success: true, data: { photos } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch community photos' }, { status: 500 })
  }
}

// POST /api/mobile/locations/[locationId]/community-photos - Add a community photo
export async function POST(request: NextRequest, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    const { locationId } = await params
    const user = await getServerSideUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    const body = await request.json()
    const { photoUrl, caption } = body
    if (!photoUrl) {
      return NextResponse.json({ success: false, error: 'Missing photoUrl' }, { status: 400 })
    }
    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    const payload = await getPayload({ config })
    // Add photo to location
    const updated = await payload.update({
      collection: 'locations',
      id: locationId,
      data: {
        communityPhotos: [
          ...(Array.isArray((await payload.findByID({ collection: 'locations', id: locationId, depth: 0 })).communityPhotos) ? (await payload.findByID({ collection: 'locations', id: locationId, depth: 0 })).communityPhotos : []),
          {
            photoUrl,
            caption,
            submittedBy: user.id,
            submittedAt: new Date().toISOString()
          }
        ]
      }
    })
    return NextResponse.json({ success: true, data: { photo: updated.communityPhotos?.slice(-1)[0] } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to add community photo' }, { status: 500 })
  }
} 