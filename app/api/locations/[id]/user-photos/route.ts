import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/locations/[id]/user-photos - Get approved user photos for a location
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: locationId } = await params
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const category = searchParams.get('category')
    const featured = searchParams.get('featured')

    const payload = await getPayload({ config })

    // Build query for approved photos
    const where: any = {
      and: [
        { location: { equals: locationId } },
        { status: { equals: 'approved' } },
        { visibility: { not_equals: 'hidden' } }
      ]
    }

    // Filter by category if specified
    if (category && category !== 'all') {
      where.and.push({ category: { equals: category } })
    }

    // Filter by featured status if specified
    if (featured === 'true') {
      where.and.push({ featured: { equals: true } })
    }

    // Fetch approved photo submissions with user and photo data
    const photoSubmissions = await payload.find({
      collection: 'locationPhotoSubmissions',
      where,
      limit,
      page,
      sort: featured === 'true' ? '-featured,-approvedAt' : '-approvedAt', // Featured first, then by approval date
      depth: 3, // Include nested photo and user data
    })

    // Format the response data
    const userPhotos = photoSubmissions.docs.map((submission: any) => ({
      id: submission.id,
      photo: {
        id: submission.photo?.id,
        url: submission.photo?.url,
        alt: submission.photo?.alt,
        width: submission.photo?.width,
        height: submission.photo?.height,
        filename: submission.photo?.filename,
        mimeType: submission.photo?.mimeType,
        filesize: submission.photo?.filesize,
      },
      caption: submission.caption,
      category: submission.category,
      tags: submission.tags?.map((t: any) => t.tag) || [],
      featured: submission.featured || false,
      qualityScore: submission.qualityScore,
      submittedBy: {
        id: submission.submittedBy?.id,
        name: submission.submittedBy?.name,
        email: submission.submittedBy?.email,
        profileImage: submission.submittedBy?.profileImage?.url,
      },
      submittedAt: submission.submittedAt,
      approvedAt: submission.approvedAt,
      approvedBy: submission.reviewedBy ? {
        id: submission.reviewedBy?.id,
        name: submission.reviewedBy?.name,
      } : null,
    }))

    // Get categories for filtering options
    const categoryCounts = await payload.find({
      collection: 'locationPhotoSubmissions',
      where: {
        and: [
          { location: { equals: locationId } },
          { status: { equals: 'approved' } },
          { visibility: { not_equals: 'hidden' } }
        ]
      },
      limit: 0, // Just get the count
    })

    // Count photos by category
    const categoryStats: Record<string, number> = {}
    const allSubmissions = await payload.find({
      collection: 'locationPhotoSubmissions',
      where: {
        and: [
          { location: { equals: locationId } },
          { status: { equals: 'approved' } },
          { visibility: { not_equals: 'hidden' } }
        ]
      },
      limit: 1000, // Get all for counting
      select: { category: true }
    })

    allSubmissions.docs.forEach((submission: any) => {
      const cat = submission.category || 'other'
      categoryStats[cat] = (categoryStats[cat] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      photos: userPhotos,
      pagination: {
        page: photoSubmissions.page,
        limit: photoSubmissions.limit,
        totalPages: photoSubmissions.totalPages,
        totalDocs: photoSubmissions.totalDocs,
        hasNextPage: photoSubmissions.hasNextPage,
        hasPrevPage: photoSubmissions.hasPrevPage,
      },
      categories: [
        { value: 'all', label: 'All Photos', count: photoSubmissions.totalDocs },
        { value: 'exterior', label: 'Exterior', count: categoryStats.exterior || 0 },
        { value: 'interior', label: 'Interior', count: categoryStats.interior || 0 },
        { value: 'food_drinks', label: 'Food & Drinks', count: categoryStats.food_drinks || 0 },
        { value: 'atmosphere', label: 'Atmosphere', count: categoryStats.atmosphere || 0 },
        { value: 'menu', label: 'Menu', count: categoryStats.menu || 0 },
        { value: 'staff', label: 'Staff', count: categoryStats.staff || 0 },
        { value: 'events', label: 'Events', count: categoryStats.events || 0 },
        { value: 'other', label: 'Other', count: categoryStats.other || 0 },
      ].filter(cat => cat.value === 'all' || cat.count > 0), // Only show categories with photos
      meta: {
        locationId,
        totalApproved: photoSubmissions.totalDocs,
        featuredCount: allSubmissions.docs.filter((s: any) => s.featured).length,
      }
    })

  } catch (error) {
    console.error('Error fetching user photos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user photos' },
      { status: 500 }
    )
  }
} 