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
    const { name, description, category, eventType, location, startDate } = await request.json()

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      )
    }

    console.log('🤖 AI Event Metadata Generation - Input:', { name, description, category, eventType, location, startDate })

    const openai = getOpenAIClient()
    
    if (!openai) {
      console.log('🤖 OpenAI API key not available, using fallback metadata')
      return NextResponse.json({
        success: true,
        metadata: generateFallbackEventMetadata(name, description, category, eventType, location)
      })
    }

    const prompt = `You are an SEO expert for Sacavia, a platform for discovering and exploring local events. Generate optimized metadata for an event listing.

Event Name: "${name}"
Description: "${description}"
Category: "${category || 'social'}"
Event Type: "${eventType || 'social_event'}"
Location: "${location || 'TBD'}"
Start Date: "${startDate || 'TBD'}"

Generate:
1. SEO-optimized title (max 60 characters) - should include event name and Sacavia branding
2. Meta description (max 160 characters) - should describe the event and encourage attendance
3. Relevant keywords (comma-separated, max 10 keywords) - focus on event discovery and attendance

Focus on:
- Sacavia platform branding (use "Sacavia" not "Event Directory")
- Event discovery and attendance keywords
- Things to do, events to attend, explore, discover
- Category-specific keywords (workshop, concert, meetup, social, etc.)
- Event-specific keywords (date, time, location, tickets, RSVP)
- Action-oriented keywords (attend, join, participate, experience, discover)

Keywords to include: "events", "things to do", "sacavia", "explore", "discover", "local events", "attend", "join"

Return as JSON:
{
  "title": "SEO-optimized title with Sacavia branding",
  "description": "Meta description encouraging attendance",
  "keywords": "keyword1, keyword2, keyword3"
}`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert SEO specialist who creates optimized metadata for local event listings. Always return valid JSON."
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
    console.log('🤖 AI Event Response:', response)

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
      aiMetadata = generateFallbackEventMetadata(name, description, category, eventType, location)
    }

    // Validate and clean the response
    const metadata = {
      title: aiMetadata.title?.substring(0, 60) || generateFallbackEventTitle(name),
      description: aiMetadata.description?.substring(0, 160) || generateFallbackEventDescription(description),
      keywords: aiMetadata.keywords || generateFallbackEventKeywords(name, description, category, eventType)
    }

    console.log('🤖 Final event metadata:', metadata)

    return NextResponse.json({
      success: true,
      metadata
    })

  } catch (error) {
    console.error('🤖 AI Event Metadata generation error:', error)
    
    // Fallback to basic metadata generation
    const { name, description, category, eventType, location } = await request.json().catch(() => ({}))
    
    return NextResponse.json({
      success: true,
      metadata: generateFallbackEventMetadata(name, description, category, eventType, location)
    })
  }
}

function generateFallbackEventMetadata(name: string, description: string, category?: string, eventType?: string, location?: string) {
  return {
    title: generateFallbackEventTitle(name),
    description: generateFallbackEventDescription(description),
    keywords: generateFallbackEventKeywords(name, description, category, eventType)
  }
}

function generateFallbackEventTitle(name: string): string {
  return `${name} - Events on Sacavia`
}

function generateFallbackEventDescription(description: string): string {
  const truncated = description.substring(0, 140)
  const baseDescription = truncated.length < description.length ? `${truncated}...` : truncated
  return `${baseDescription} Discover and attend more events on Sacavia.`
}

function generateFallbackEventKeywords(name: string, description: string, category?: string, eventType?: string): string {
  // Extract event-related words from name and description
  const eventWords = name.toLowerCase().split(' ').filter(word => 
    word.length > 2 && !['the', 'and', 'or', 'of', 'in', 'at', 'on'].includes(word)
  )
  
  const descriptionWords = description.toLowerCase().split(' ').slice(0, 5).filter(word => 
    word.length > 2 && !['the', 'and', 'or', 'of', 'in', 'at', 'on', 'a', 'an'].includes(word)
  )
  
  // Core Sacavia event keywords
  const coreKeywords = [
    'sacavia',
    'events',
    'explore',
    'discover',
    'things to do',
    'local events',
    'attend',
    'join'
  ]
  
  // Category-specific keywords
  const categoryKeywords = category ? [category.toLowerCase()] : []
  
  // Event type keywords
  const eventTypeKeywords = eventType ? [eventType.toLowerCase().replace('_', ' ')] : []
  
  // Combine all keywords
  const allKeywords = [
    ...coreKeywords,
    ...eventWords,
    ...descriptionWords,
    ...categoryKeywords,
    ...eventTypeKeywords
  ].filter(word => word && word.length > 2)
  
  // Remove duplicates and limit to 10
  return [...new Set(allKeywords)].slice(0, 10).join(', ')
}
