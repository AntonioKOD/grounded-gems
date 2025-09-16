import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

export const dynamic = 'force-dynamic'

// CORS configuration
const CONTEST_APP_URL = process.env.CONTEST_APP_URL || 'https://vote.sacavia.com'

interface LeaderboardEntry {
  id: string
  title: string
  city: string
  upvotesCount: number
  author: {
    username: string
    avatar?: string
  }
  thumbnailUrl?: string
  permalink: string
  rank: number
  change?: 'up' | 'down' | 'same'
}

interface ContestLeaderboardResponse {
  entries: LeaderboardEntry[]
  totalEntries: number
  lastUpdated: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const city = searchParams.get('city')
    const timeframe = searchParams.get('timeframe') || 'all' // all, week, month

    console.log('🏆 Contest Leaderboard API - Parameters:', {
      limit,
      city,
      timeframe
    })

    // Initialize PayloadCMS
    const payload = await getPayload({ config: payloadConfig })

    // Build query conditions
    const where: any = {
      and: [
        { contestEligible: { equals: true } },
        { status: { equals: 'PUBLISHED' } },
        { upvotesCount: { greater_than: 0 } } // Only show entries with votes
      ]
    }

    // Add city filter if provided
    if (city) {
      where.and.push({ city: { contains: city } })
    }

    // Add timeframe filter if provided
    if (timeframe !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (timeframe) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(0) // All time
      }

      where.and.push({ createdAt: { greater_than_equal: startDate.toISOString() } })
    }

    console.log('🔍 Leaderboard query conditions:', JSON.stringify(where, null, 2))

    // Fetch contest entries sorted by upvotes count
    const result = await payload.find({
      collection: 'experiences',
      where,
      sort: '-upvotesCount,-createdAt', // Sort by votes (desc), then by creation date (desc)
      limit,
      depth: 2 // Include author information
    })

    console.log(`📊 Found ${result.docs.length} leaderboard entries`)

    // Process entries into leaderboard format
    const entries: LeaderboardEntry[] = result.docs.map((doc, index) => ({
      id: String(doc.id),
      title: String(doc.title || ''),
      city: String(doc.city || ''),
      upvotesCount: Number(doc.upvotesCount || 0),
      author: {
        username: doc.owner?.username || 'Anonymous',
        avatar: doc.owner?.avatar?.url || undefined
      },
      thumbnailUrl: doc.media?.url || undefined,
      permalink: `/experiences/${doc.id}`,
      rank: index + 1,
      // For now, we'll set change as 'same' - could be enhanced with historical data
      change: 'same' as const
    }))

    const response: ContestLeaderboardResponse = {
      entries,
      totalEntries: result.totalDocs,
      lastUpdated: new Date().toISOString()
    }

    console.log(`✅ Returning ${entries.length} leaderboard entries`)

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300', // Cache for 1 minute, stale for 5
        'Access-Control-Allow-Origin': CONTEST_APP_URL,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    console.error('❌ Error fetching contest leaderboard:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch contest leaderboard',
        details: errorMessage,
        entries: [],
        totalEntries: 0,
        lastUpdated: new Date().toISOString()
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

