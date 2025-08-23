import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: NextRequest, { params }: { params: Promise<{ locationId: string }> }) {
  const { locationId } = await params
  const payload = await getPayload({ config })
  const location = await payload.findByID({
    collection: 'locations',
    id: locationId,
    depth: 1
  })
  if (!location) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }
  // Only return preview fields
  return NextResponse.json({
    success: true,
    data: {
      id: location.id,
      name: location.name,
      imageUrl: typeof location.featuredImage === 'string' ? location.featuredImage : location.featuredImage?.url,
      address: typeof location.address === 'string' ? location.address : Object.values(location.address || {}).filter(Boolean).join(', '),
      rating: location.averageRating,
      shortDescription: location.shortDescription,
      isVerified: location.isVerified,
      reviewCount: location.reviewCount,
      categories: location.categories?.map((cat: any) => typeof cat === 'string' ? cat : cat.name || cat.id),
      isFeatured: location.isFeatured,
      priceRange: location.priceRange,
      coordinates: location.coordinates || undefined
    }
  })
} 