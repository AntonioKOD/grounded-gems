import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/mobile/guides/[id] - Guide detail (mobile)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await getPayload({ config })
    const { id } = params
    if (!id) {
      return NextResponse.json({ success: false, error: 'Guide ID is required' }, { status: 400 })
    }

    const guide = await payload.findByID({
      collection: 'guides',
      id,
      depth: 2,
      populate: {
        featuredImage: { select: { url: true, alt: true } },
        creator: { select: { id: true, name: true, profileImage: true } }
      }
    })

    if (!guide) {
      return NextResponse.json({ success: false, error: 'Guide not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      guide: {
        id: guide.id,
        title: guide.title,
        description: guide.description,
        content: guide.content,
        categories: guide.categories,
        price: guide.price,
        isPublic: guide.isPublic,
        featuredImage: guide.featuredImage ? {
          url: guide.featuredImage.url,
          alt: guide.featuredImage.alt || ''
        } : null,
        creator: guide.creator ? {
          id: guide.creator.id,
          name: guide.creator.name,
          profileImage: guide.creator.profileImage?.url || null
        } : null,
        createdAt: guide.createdAt,
        updatedAt: guide.updatedAt
      }
    })
  } catch (error) {
    console.error('Error fetching guide detail (mobile):', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch guide',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 