import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get current week info
    const now = new Date()
    const weekNumber = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)
    const year = now.getFullYear()
    
    // Get real data from database
    let activeExplorers = 0
    let newDiscoveries = 0
    let trending: string[] = []
    let goals: Array<{ title: string; progress: number }> = []

    try {
      // Get active users this week
      const activeUsers = await payload.find({
        collection: 'users',
        where: {
          updatedAt: {
            greater_than: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        },
        limit: 1000
      })
      activeExplorers = activeUsers.docs.length

      // Get new locations added this week
      const newLocations = await payload.find({
        collection: 'locations',
        where: {
          and: [
            { createdAt: { greater_than: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() } },
            { status: { equals: 'published' } }
          ]
        },
        limit: 1000
      })
      newDiscoveries = newLocations.docs.length

      // Get trending categories from recent posts
      const recentPosts = await payload.find({
        collection: 'posts',
        where: {
          createdAt: { greater_than: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }
        },
        limit: 100
      })

      // Extract trending topics from post content
      const allContent = recentPosts.docs.map(post => 
        `${post.title || ''} ${post.content || ''} ${post.tags?.join(' ') || ''}`
      ).join(' ').toLowerCase()

      // Simple keyword extraction (in a real app, you'd use NLP)
      const keywords = [
        'coffee', 'restaurant', 'park', 'museum', 'bar', 'cafe', 'shop', 'gallery',
        'beach', 'mountain', 'hiking', 'yoga', 'fitness', 'art', 'music', 'food'
      ]

      const trendingKeywords = keywords
        .filter(keyword => allContent.includes(keyword))
        .slice(0, 3)
        .map(keyword => `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} spots`)

      if (trendingKeywords.length > 0) {
        trending = trendingKeywords
      }

      // Generate community goals based on current activity (no challenges until implemented)
      goals = [
        { 
          title: 'Visit 5 new places', 
          progress: Math.min(Math.floor((newLocations.docs.length / 5) * 100), 100) 
        },
        { 
          title: 'Share 3 experiences', 
          progress: Math.min(Math.floor((recentPosts.docs.length / 3) * 100), 100) 
        }
      ]

    } catch (error) {
      console.warn('Error fetching real insights data:', error)
      // Use minimal fallback data if database is unavailable
    }

    return NextResponse.json({
      success: true,
      data: {
        activeExplorers,
        newDiscoveries,
        trending,
        goals,
        weekNumber,
        year,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in weekly insights API:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to load weekly insights',
      data: {
        activeExplorers: 0,
        newDiscoveries: 0,
        trending: [],
        goals: [],
        weekNumber: Math.ceil(((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7),
        year: new Date().getFullYear(),
        generatedAt: new Date().toISOString()
      }
    }, { status: 500 })
  }
} 