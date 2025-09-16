import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

export const dynamic = 'force-dynamic'

// CORS configuration
const CONTEST_APP_URL = process.env.CONTEST_APP_URL || 'https://vote.sacavia.com'

interface ContestStats {
  totalEntries: number
  totalVotes: number
  totalParticipants: number
  topCity: {
    name: string
    entries: number
  }
  recentActivity: {
    entriesLast24h: number
    votesLast24h: number
  }
  prizePool: {
    total: number
    grandPrize: number
    cityWinners: number
    categoryWinners: number
  }
  contestStatus: {
    isActive: boolean
    startDate: string
    endDate: string
    daysRemaining: number
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Contest Stats API - Fetching statistics...')

    // Initialize PayloadCMS
    const payload = await getPayload({ config: payloadConfig })

    // Get total contest entries
    const entriesResult = await payload.find({
      collection: 'experiences',
      where: {
        and: [
          { contestEligible: { equals: true } },
          { status: { equals: 'PUBLISHED' } }
        ]
      },
      limit: 0 // Just get count
    })

    // Get total votes across all contest entries
    const votesResult = await payload.find({
      collection: 'contest-upvotes',
      limit: 0 // Just get count
    })

    // Get unique participants (users who have submitted contest entries)
    const participantsResult = await payload.find({
      collection: 'experiences',
      where: {
        and: [
          { contestEligible: { equals: true } },
          { status: { equals: 'PUBLISHED' } }
        ]
      },
      limit: 0,
      depth: 0
    })

    // Get top city by entries
    const cityStatsResult = await payload.find({
      collection: 'experiences',
      where: {
        and: [
          { contestEligible: { equals: true } },
          { status: { equals: 'PUBLISHED' } }
        ]
      },
      limit: 1000, // Get all entries to calculate city stats
      depth: 0
    })

    // Calculate city statistics
    const cityCounts: Record<string, number> = {}
    cityStatsResult.docs.forEach((entry: any) => {
      const city = entry.city
      if (city) {
        cityCounts[city] = (cityCounts[city] || 0) + 1
      }
    })

    const topCity = Object.entries(cityCounts)
      .sort(([, a], [, b]) => b - a)[0] || ['No entries yet', 0]

    // Get recent activity (last 24 hours)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const recentEntriesResult = await payload.find({
      collection: 'experiences',
      where: {
        and: [
          { contestEligible: { equals: true } },
          { status: { equals: 'PUBLISHED' } },
          { createdAt: { greater_than_equal: last24h } }
        ]
      },
      limit: 0
    })

    const recentVotesResult = await payload.find({
      collection: 'contest-upvotes',
      where: {
        createdAt: { greater_than_equal: last24h }
      },
      limit: 0
    })

    // Contest configuration (these could be moved to environment variables or a config collection)
    const contestStartDate = new Date('2024-01-01T00:00:00Z')
    const contestEndDate = new Date('2024-03-15T23:59:59Z')
    const now = new Date()
    const isActive = now >= contestStartDate && now <= contestEndDate
    const daysRemaining = Math.max(0, Math.ceil((contestEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

    // Calculate unique participants
    const uniqueParticipants = new Set(
      participantsResult.docs.map((entry: any) => entry.owner).filter(Boolean)
    ).size

    const stats: ContestStats = {
      totalEntries: entriesResult.totalDocs,
      totalVotes: votesResult.totalDocs,
      totalParticipants: uniqueParticipants,
      topCity: {
        name: topCity[0],
        entries: topCity[1]
      },
      recentActivity: {
        entriesLast24h: recentEntriesResult.totalDocs,
        votesLast24h: recentVotesResult.totalDocs
      },
      prizePool: {
        total: 50000,
        grandPrize: 25000,
        cityWinners: 20000, // 10 cities × $2000
        categoryWinners: 5000 // 5 categories × $1000
      },
      contestStatus: {
        isActive,
        startDate: contestStartDate.toISOString(),
        endDate: contestEndDate.toISOString(),
        daysRemaining
      }
    }

    console.log('✅ Contest stats calculated:', {
      totalEntries: stats.totalEntries,
      totalVotes: stats.totalVotes,
      totalParticipants: stats.totalParticipants,
      topCity: stats.topCity.name
    })

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 minutes, stale for 10
        'Access-Control-Allow-Origin': CONTEST_APP_URL,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })

  } catch (error) {
    console.error('❌ Error fetching contest stats:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch contest statistics',
        details: errorMessage
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

