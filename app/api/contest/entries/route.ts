import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

export const dynamic = 'force-dynamic'

// CORS configuration
const CONTEST_APP_URL = process.env.CONTEST_APP_URL || 'https://vote.sacavia.com'

interface ContestEntry {
  experienceId: string
  title: string
  city: string
  thumbnailUrl?: string
  permalink: string
  createdAt: string
  upvotesCount: number
}

interface ContestEntriesResponse {
  entries: ContestEntry[]
  nextCursor?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 50)
    const cursor = searchParams.get('cursor')
    const city = searchParams.get('city')
    const q = searchParams.get('q')

    console.log('🎯 Contest Entries API - Parameters:', {
      limit,
      cursor,
      city,
      q
    })

    // Initialize PayloadCMS
    const payload = await getPayload({ config: payloadConfig })

    // Build query conditions
    const where: any = {
      and: [
        { contestEligible: { equals: true } },
        { status: { equals: 'PUBLISHED' } }
      ]
    }

    // Add city filter if provided
    if (city) {
      where.and.push({ city: { contains: city } })
    }

    // Add search query if provided
    if (q) {
      where.and.push({
        or: [
          { title: { contains: q } },
          { description: { contains: q } },
          { city: { contains: q } }
        ]
      })
    }

    // Add cursor-based pagination if provided
    if (cursor) {
      where.and.push({ id: { greater_than: cursor } })
    }

    console.log('🔍 Query conditions:', JSON.stringify(where, null, 2))

    // Fetch contest entries
    const result = await payload.find({
      collection: 'experiences',
      where,
      sort: '-createdAt',
      limit: limit + 1, // Fetch one extra to determine if there are more
      depth: 1
    })

    console.log(`📊 Found ${result.docs.length} contest entries`)

    // Process entries
    const entries: ContestEntry[] = result.docs.slice(0, limit).map(doc => ({
      experienceId: String(doc.id),
      title: String(doc.title || ''),
      city: String(doc.city || ''),
      thumbnailUrl: doc.media?.url || undefined,
      permalink: `/experiences/${doc.id}`,
      createdAt: String(doc.createdAt || ''),
      upvotesCount: Number(doc.upvotesCount || 0)
    }))

    // Determine next cursor
    let nextCursor: string | undefined
    if (result.docs.length > limit && result.docs[limit]) {
      nextCursor = String(result.docs[limit].id)
    }

    const response: ContestEntriesResponse = {
      entries,
      nextCursor
    }

    console.log(`✅ Returning ${entries.length} entries${nextCursor ? `, next cursor: ${nextCursor}` : ''}`)

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
        'Access-Control-Allow-Origin': CONTEST_APP_URL,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    console.error('❌ Error fetching contest entries:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch contest entries',
        details: errorMessage,
        entries: []
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': CONTEST_APP_URL,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': CONTEST_APP_URL,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  })
}
