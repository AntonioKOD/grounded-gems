import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Initialize OpenAI client only if API key is available
const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, categories = [] } = await request.json()

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      )
    }

    console.log('🤖 AI Metadata Generation - Input:', { name, description, categories })

    const openai = getOpenAIClient()
    
    if (!openai) {
      console.log('🤖 OpenAI API key not available, using fallback metadata')
      return NextResponse.json({
        success: true,
        metadata: generateFallbackMetadata(name, description, categories)
      })
    }

    const prompt = `You are an SEO expert for Sacavia, a platform for discovering and exploring local places. Generate optimized metadata for a location listing.

Location Name: "${name}"
Description: "${description}"
Categories: ${categories.join(', ')}

Generate:
1. SEO-optimized title (max 60 characters) - should include location name and Sacavia branding
2. Meta description (max 160 characters) - should describe the place and encourage exploration
3. Relevant keywords (comma-separated, max 10 keywords) - focus on discovery and exploration

Focus on:
- Sacavia platform branding (use "Sacavia" not "Local Business Directory")
- Location discovery and exploration keywords
- Things to do, places to go, explore, discover
- Category-specific keywords (restaurant, cafe, park, etc.)
- Local area keywords if location is mentioned
- Action-oriented keywords (visit, explore, discover, experience)

Keywords to include: "things to do", "places to go", "sacavia", "explore", "discover", "local places"

Return as JSON:
{
  "title": "SEO-optimized title with Sacavia branding",
  "description": "Meta description encouraging exploration",
  "keywords": "keyword1, keyword2, keyword3"
}`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert SEO specialist who creates optimized metadata for local business listings. Always return valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    })

    const response = completion.choices[0]?.message?.content
    console.log('🤖 AI Response:', response)

    if (!response) {
      throw new Error('No response from AI')
    }

    // Parse the AI response
    let aiMetadata
    try {
      aiMetadata = JSON.parse(response)
    } catch (parseError) {
      console.error('🤖 Failed to parse AI response:', parseError)
      // Fallback to basic metadata generation
      aiMetadata = generateFallbackMetadata(name, description, categories)
    }

    // Validate and clean the response
    const metadata = {
      title: aiMetadata.title?.substring(0, 60) || generateFallbackTitle(name),
      description: aiMetadata.description?.substring(0, 160) || generateFallbackDescription(description),
      keywords: aiMetadata.keywords || generateFallbackKeywords(name, description, categories)
    }

    console.log('🤖 Final metadata:', metadata)

    return NextResponse.json({
      success: true,
      metadata
    })

  } catch (error) {
    console.error('🤖 AI Metadata generation error:', error)
    
    // Fallback to basic metadata generation
    const { name, description, categories = [] } = await request.json().catch(() => ({}))
    
    return NextResponse.json({
      success: true,
      metadata: generateFallbackMetadata(name, description, categories)
    })
  }
}

function generateFallbackMetadata(name: string, description: string, categories: string[]) {
  return {
    title: generateFallbackTitle(name),
    description: generateFallbackDescription(description),
    keywords: generateFallbackKeywords(name, description, categories)
  }
}

function generateFallbackTitle(name: string): string {
  return `${name} - Discover on Sacavia`
}

function generateFallbackDescription(description: string): string {
  const truncated = description.substring(0, 140)
  const baseDescription = truncated.length < description.length ? `${truncated}...` : truncated
  return `${baseDescription} Discover more places to explore on Sacavia.`
}

function generateFallbackKeywords(name: string, description: string, categories: string[]): string {
  // Extract location-related words from name and description
  const locationWords = name.toLowerCase().split(' ').filter(word => 
    word.length > 2 && !['the', 'and', 'or', 'of', 'in', 'at', 'on'].includes(word)
  )
  
  const descriptionWords = description.toLowerCase().split(' ').slice(0, 5).filter(word => 
    word.length > 2 && !['the', 'and', 'or', 'of', 'in', 'at', 'on', 'a', 'an'].includes(word)
  )
  
  // Core Sacavia keywords
  const coreKeywords = [
    'sacavia',
    'explore',
    'discover',
    'things to do',
    'places to go',
    'local places'
  ]
  
  // Category-specific keywords
  const categoryKeywords = categories.map(cat => cat.toLowerCase())
  
  // Combine all keywords
  const allKeywords = [
    ...coreKeywords,
    ...locationWords,
    ...descriptionWords,
    ...categoryKeywords
  ].filter(word => word && word.length > 2)
  
  // Remove duplicates and limit to 10
  return [...new Set(allKeywords)].slice(0, 10).join(', ')
}
