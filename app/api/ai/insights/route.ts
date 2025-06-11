import { NextRequest, NextResponse } from 'next/server'
import { generateInsiderTipsFromWebsite, generateLocationInsights, generateBusinessDescriptionFromWebsite } from '@/lib/ai-insights'
import { generateStructuredInsiderTips, structuredTipsToLegacyFormat } from '@/lib/structured-insider-tips'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      requestType, 
      type, 
      locationName, 
      locationAddress, 
      categories, 
      description, 
      website, 
      phone,
      websiteUrl,
      locationCategory,
      category
    } = body

    // Handle both old and new request formats
    const requestTypeToUse = requestType || type
    
    switch (requestTypeToUse) {
      case 'business_description':
        return await handleBusinessDescription({
          locationName,
          website,
          locationAddress,
          categories,
          phone
        })
      case 'insider_tips':
        return await handleInsiderTips({
          locationName,
          website,
          locationAddress,
          categories,
          description
        })
      case 'insider-tips':
        return await handleLegacyInsiderTips({
          websiteUrl: websiteUrl || website,
          locationName,
          locationCategory: locationCategory || (categories && categories.length > 0 ? categories[0] : undefined)
        })
      case 'location-insights':
        return await handleLocationInsights({
          locationName,
          description,
          category: category || (categories && categories.length > 0 ? categories[0] : 'general'),
          websiteUrl: websiteUrl || website
        })
      default:
        return NextResponse.json(
          { success: false, error: `Invalid request type: ${requestTypeToUse}` },
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

async function handleBusinessDescription(params: {
  locationName: string
  website?: string
  locationAddress?: string
  categories?: string[]
  phone?: string
}) {
  const { locationName, website, locationAddress, categories, phone } = params

  if (!locationName) {
    return NextResponse.json(
      { success: false, error: 'Location name is required' },
      { status: 400 }
    )
  }

  if (!website) {
    return NextResponse.json(
      { success: false, error: 'Website URL is required for business description generation' },
      { status: 400 }
    )
  }

  console.log('🤖 Generating business description for:', locationName, 'from website:', website)

  try {
    const result = await generateBusinessDescriptionFromWebsite(
      website,
      locationName,
      locationAddress,
      categories,
      phone
    )

    return NextResponse.json({
      success: true,
      insights: result.description,
      confidence: result.confidence,
      error: result.error
    })
  } catch (error) {
    console.error('Error generating business description:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate business description' },
      { status: 500 }
    )
  }
}

async function handleInsiderTips(params: {
  locationName: string
  website?: string
  locationAddress?: string
  categories?: string[]
  description?: string
}) {
  const { locationName, website, categories, description } = params

  if (!locationName) {
    return NextResponse.json(
      { success: false, error: 'Location name is required' },
      { status: 400 }
    )
  }

  console.log('🤖 Generating insider tips for:', locationName)

  try {
    let result
    
    if (website) {
      // Generate structured tips from website content
      const structuredResult = await generateStructuredInsiderTips(
        website,
        locationName,
        categories && categories.length > 0 ? categories[0] : undefined
      )
      
      // Return structured tips directly for new frontend, or convert to legacy format if needed
      return NextResponse.json({
        success: true,
        insights: structuredResult.tips, // Return structured array
        structuredTips: structuredResult.tips, // Explicit structured format
        legacyFormat: structuredTipsToLegacyFormat(structuredResult.tips), // Backward compatibility
        confidence: structuredResult.confidence,
        error: structuredResult.error
      })
    } else {
      // Generate basic tips from location info only
      const category = categories && categories.length > 0 ? categories[0] : 'general'
      const insights = await generateLocationInsights(locationName, description || '', category)
      result = {
        tips: insights.insiderTips,
        confidence: 0.8
      }
    }

    return NextResponse.json({
      success: true,
      insights: result.tips,
      confidence: result.confidence,
      error: result.error
    })
  } catch (error) {
    console.error('Error generating insider tips:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate insider tips' },
      { status: 500 }
    )
  }
}

async function handleLegacyInsiderTips(params: {
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