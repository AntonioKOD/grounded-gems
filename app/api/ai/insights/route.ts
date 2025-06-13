import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { scrapeWebsiteContent } from '@/lib/website-scraper'
import { StructuredTip, calculateStructuredTipsConfidence, generateFallbackStructuredTips } from '@/lib/structured-insider-tips'

interface InsiderTipsResult {
  tips: StructuredTip[]
  confidence: number
  error?: string
}

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('🔍 AI Insights API - Received request body:', JSON.stringify(body, null, 2))
    
    const { locationName, website, categories, description, type } = body

    if (!locationName) {
      console.log('❌ AI Insights API - Missing location name')
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      )
    }

    console.log('✅ AI Insights API - Request type:', type)

    if (type === 'insider_tips') {
      const result = await handleInsiderTips({
        locationName,
        website,
        categories,
        description
      })
      return NextResponse.json(result)
    }

    if (type === 'business_description') {
      const result = await handleBusinessDescription({
        locationName,
        website,
        categories,
        description
      })
      return NextResponse.json(result)
    }

    console.log('❌ AI Insights API - Invalid request type received:', type)
    return NextResponse.json(
      { error: 'Invalid request type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in insights API:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}

async function handleInsiderTips({
  locationName,
  website,
  categories,
  description
}: {
  locationName: string
  website?: string
  categories?: string[]
  description?: string
}): Promise<InsiderTipsResult> {
  try {
    console.log('Generating insider tips for:', locationName)
    
    // If we have a website, try to generate tips from it
    if (website) {
      const result = await generateStructuredInsiderTips(website, locationName, categories?.[0])
      if (result.tips.length > 0) {
        return result
      }
    }

    // If no website or website generation failed, use basic location info
    return generateLocationInsights(locationName, description || '', categories?.[0] || '')
  } catch (error) {
    console.error('Error generating insider tips:', error)
    return {
      tips: generateFallbackStructuredTips(locationName, categories?.[0]),
      confidence: 0.3
    }
  }
}

async function handleBusinessDescription({
  locationName,
  website,
  categories,
  description
}: {
  locationName: string
  website?: string
  categories?: string[]
  description?: string
}): Promise<{ success: boolean; insights?: string; error?: string }> {
  try {
    console.log('Generating business description for:', locationName)
    
    let businessDescription = ''
    
    // If we have a website, try to generate description from it
    if (website) {
      businessDescription = await generateBusinessDescriptionFromWebsite(website, locationName, categories?.[0])
    }
    
    // If no website or website generation failed, use basic location info
    if (!businessDescription && description) {
      businessDescription = await generateBusinessDescriptionFromInfo(locationName, description, categories?.[0])
    }
    
    if (businessDescription) {
      return {
        success: true,
        insights: businessDescription
      }
    } else {
      return {
        success: false,
        error: 'Could not generate business description'
      }
    }
  } catch (error) {
    console.error('Error generating business description:', error)
    return {
      success: false,
      error: 'Failed to generate business description'
    }
  }
}

async function generateStructuredInsiderTips(
  websiteUrl: string,
  locationName: string,
  locationCategory?: string
): Promise<InsiderTipsResult> {
  try {
    const websiteContent = await scrapeWebsiteContent(websiteUrl)
    if (!websiteContent) {
      throw new Error('Could not extract meaningful content from website')
    }

    const prompt = createStructuredTipsPrompt(locationName, locationCategory, websiteContent)
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates insider tips for locations. Focus on providing specific, actionable advice that would be valuable to visitors."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from AI')
    }

    // Parse the AI response into structured tips
    const tips = parseStructuredTipsResponse(response)
    const confidence = calculateStructuredTipsConfidence(tips, websiteContent)

    return {
      tips,
      confidence
    }
  } catch (error) {
    console.error('Error in generateStructuredInsiderTips:', error)
    throw error
  }
}

async function generateLocationInsights(
  locationName: string,
  description: string,
  category?: string
): Promise<InsiderTipsResult> {
  try {
    const prompt = createLocationInsightsPrompt(locationName, description, category)
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates insider tips for locations. Focus on providing specific, actionable advice that would be valuable to visitors."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from AI')
    }

    // Parse the AI response into structured tips
    const tips = parseStructuredTipsResponse(response)
    const confidence = calculateStructuredTipsConfidence(tips, description)

    return {
      tips,
      confidence
    }
  } catch (error) {
    console.error('Error in generateLocationInsights:', error)
    return {
      tips: generateFallbackStructuredTips(locationName, category),
      confidence: 0.3
    }
  }
}

function createStructuredTipsPrompt(
  locationName: string,
  category: string | undefined,
  websiteContent: string
): string {
  return `Generate insider tips for ${locationName}${category ? ` (${category})` : ''} based on this website content:

${websiteContent}

Generate 5-8 insider tips in the following format:
[
  {
    "category": "timing|food|secrets|protips|access|savings|recommendations|hidden",
    "tip": "specific tip text",
    "priority": "high|medium|low"
  }
]

Guidelines:
- Tips should be specific and actionable
- Each tip should be under 150 characters
- Include a mix of categories
- Focus on unique insights that aren't obvious
- Prioritize tips that would be most valuable to visitors
- DO NOT include priority labels like [HELPFUL] or [ESSENTIAL] in the tip text itself
- The tip text should be clean and natural without any brackets or indicators`
}

function createLocationInsightsPrompt(
  locationName: string,
  description: string,
  category: string | undefined
): string {
  return `Generate insider tips for ${locationName}${category ? ` (${category})` : ''} based on this description:

${description}

Generate 3-5 insider tips in the following format:
[
  {
    "category": "timing|food|secrets|protips|access|savings|recommendations|hidden",
    "tip": "specific tip text",
    "priority": "high|medium|low"
  }
]

Guidelines:
- Tips should be specific and actionable
- Each tip should be under 150 characters
- Include a mix of categories
- Focus on unique insights that aren't obvious
- Prioritize tips that would be most valuable to visitors
- DO NOT include priority labels like [HELPFUL] or [ESSENTIAL] in the tip text itself
- The tip text should be clean and natural without any brackets or indicators`
}

function parseStructuredTipsResponse(response: string): StructuredTip[] {
  try {
    // Extract JSON array from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON array found in response')
    }

    const tips = JSON.parse(jsonMatch[0])
    return tips.map((tip: { category: string; tip: string; priority: string }) => ({
      ...tip,
      isVerified: false,
      source: 'ai_generated' as const
    }))
  } catch (error) {
    console.error('Error parsing structured tips response:', error)
    return []
  }
}

async function generateBusinessDescriptionFromWebsite(
  websiteUrl: string,
  locationName: string,
  locationCategory?: string
): Promise<string> {
  try {
    const websiteContent = await scrapeWebsiteContent(websiteUrl)
    if (!websiteContent) {
      throw new Error('Could not extract meaningful content from website')
    }

    const prompt = `Generate a compelling business description for ${locationName}${locationCategory ? ` (${locationCategory})` : ''} based on this website content:

${websiteContent}

Create a 2-3 paragraph description that:
- Captures the essence and unique qualities of the business
- Highlights what makes it special or different
- Appeals to potential visitors
- Is written in an engaging, informative tone
- Focuses on the experience visitors can expect

Keep it concise but compelling, around 150-250 words.`
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a skilled copywriter who creates compelling business descriptions that attract visitors and capture the unique essence of each location."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from AI')
    }

    return response.trim()
  } catch (error) {
    console.error('Error in generateBusinessDescriptionFromWebsite:', error)
    throw error
  }
}

async function generateBusinessDescriptionFromInfo(
  locationName: string,
  description: string,
  category?: string
): Promise<string> {
  try {
    const prompt = `Generate a compelling business description for ${locationName}${category ? ` (${category})` : ''} based on this information:

${description}

Create a 2-3 paragraph description that:
- Enhances and expands on the provided information
- Captures what makes this location special
- Appeals to potential visitors
- Is written in an engaging, informative tone
- Focuses on the experience visitors can expect

Keep it concise but compelling, around 150-250 words.`
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a skilled copywriter who creates compelling business descriptions that attract visitors and capture the unique essence of each location."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from AI')
    }

    return response.trim()
  } catch (error) {
    console.error('Error in generateBusinessDescriptionFromInfo:', error)
    throw error
  }
} 