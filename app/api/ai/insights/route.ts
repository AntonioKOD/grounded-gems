import { NextRequest, NextResponse } from 'next/server'
import { generateInsiderTipsFromWebsite, generateLocationInsights } from '@/lib/ai-insights'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...params } = body

    switch (type) {
      case 'insider-tips':
        return await handleInsiderTips(params)
      case 'location-insights':
        return await handleLocationInsights(params)
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid request type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('AI insights API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

async function handleInsiderTips(params: {
  websiteUrl: string
  locationName: string
  locationCategory?: string
}) {
  const { websiteUrl, locationName, locationCategory } = params

  if (!websiteUrl || !locationName) {
    return NextResponse.json(
      { success: false, error: 'Website URL and location name are required' },
      { status: 400 }
    )
  }

  const result = await generateInsiderTipsFromWebsite(websiteUrl, locationName, locationCategory)

  return NextResponse.json({
    success: true,
    data: result
  })
}

async function handleLocationInsights(params: {
  locationName: string
  description: string
  category: string
  websiteUrl?: string
}) {
  const { locationName, description, category, websiteUrl } = params

  if (!locationName || !description || !category) {
    return NextResponse.json(
      { success: false, error: 'Location name, description, and category are required' },
      { status: 400 }
    )
  }

  const result = await generateLocationInsights(locationName, description, category, websiteUrl)

  return NextResponse.json({
    success: true,
    data: result
  })
} 