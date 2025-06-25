import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const theme = searchParams.get('theme')
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
    const weekNumber = searchParams.get('weekNumber') ? parseInt(searchParams.get('weekNumber')!) : undefined
    const status = searchParams.get('status') || 'published'
    const isActive = searchParams.get('isActive') !== 'false'
    
    // Build where clause
    const whereClause: any = {
      and: [
        { status: { equals: status } }
      ]
    }
    
    if (isActive) {
      whereClause.and.push({ isActive: { equals: true } })
    }
    
    if (theme) {
      whereClause.and.push({ theme: { equals: theme } })
    }
    
    if (year) {
      whereClause.and.push({ year: { equals: year } })
    }
    
    if (weekNumber) {
      whereClause.and.push({ weekNumber: { equals: weekNumber } })
    }
    
    // Fetch weekly features
    const result = await payload.find({
      collection: 'weekly-features',
      where: whereClause,
      page,
      limit,
      depth: 2,
      sort: '-publishedAt'
    })
    
    // Transform the data for frontend consumption
    const transformedFeatures = result.docs.map((feature: any) => ({
      id: feature.id,
      title: feature.title,
      subtitle: feature.subtitle,
      description: extractTextFromRichText(feature.description),
      theme: feature.theme,
      contentType: feature.contentType,
      weekNumber: feature.weekNumber,
      year: feature.year,
      isActive: feature.isActive,
      status: feature.status,
      publishedAt: feature.publishedAt,
      coverImage: feature.coverImage?.url ? {
        url: feature.coverImage.url,
        alt: feature.coverImage.alt
      } : null,
      gallery: feature.gallery?.map((item: any) => ({
        url: item.image?.url,
        caption: item.caption,
        alt: item.image?.alt
      })).filter((item: any) => item.url) || [],
      featuredLocations: feature.featuredLocations?.map((location: any) => ({
        id: location.id,
        name: location.name,
        description: location.description,
        image: location.featuredImage?.url,
        rating: location.averageRating,
        reviewCount: location.reviewCount
      })) || [],
      featuredPosts: feature.featuredPosts?.map((post: any) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        author: {
          id: post.author?.id,
          name: post.author?.name,
          avatar: post.author?.profileImage?.url || post.author?.avatar?.url
        },
        image: post.featuredImage?.url || post.image?.url,
        createdAt: post.createdAt
      })) || [],
      featuredGuides: feature.featuredGuides?.map((guide: any) => ({
        id: guide.id,
        title: guide.title,
        description: guide.description,
        author: {
          id: guide.author?.id,
          name: guide.author?.name,
          avatar: guide.author?.profileImage?.url || guide.author?.avatar?.url
        },
        coverImage: guide.coverImage?.url,
        pricing: guide.pricing,
        rating: guide.averageRating,
        reviewCount: guide.reviewCount
      })) || [],
      challenge: feature.challenge ? {
        title: feature.challenge.title,
        description: feature.challenge.description,
        difficulty: feature.challenge.difficulty,
        duration: feature.challenge.duration,
        reward: feature.challenge.reward,
        targetCount: feature.challenge.targetCount,
        expiresAt: feature.challenge.expiresAt
      } : null,
      analytics: feature.analytics || {
        viewCount: 0,
        engagementCount: 0,
        participantCount: 0,
        shareCount: 0
      },
      createdAt: feature.createdAt,
      updatedAt: feature.updatedAt
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        features: transformedFeatures,
        pagination: {
          page,
          limit,
          totalPages: result.totalPages,
          totalDocs: result.totalDocs,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage
        }
      }
    })
    
  } catch (error) {
    console.error('Weekly features API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch weekly features',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to extract text from rich text
function extractTextFromRichText(richText: any): string {
  if (typeof richText === 'string') {
    return richText.replace(/<[^>]+>/g, '').trim()
  }
  
  if (!richText || !richText.root || !richText.root.children) {
    return ''
  }
  
  const extractText = (children: any[]): string => {
    return children.map((child: any) => {
      if (child.type === 'text') {
        return child.text || ''
      }
      if (child.children && Array.isArray(child.children)) {
        return extractText(child.children)
      }
      return ''
    }).join(' ')
  }
  
  return extractText(richText.root.children).trim()
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get user from session
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Create new weekly feature
    const newFeature = await payload.create({
      collection: 'weekly-features',
      data: {
        ...body,
        createdBy: user.id
      }
    })
    
    return NextResponse.json({
      success: true,
      data: newFeature
    })
    
  } catch (error) {
    console.error('Create weekly feature error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create weekly feature',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 