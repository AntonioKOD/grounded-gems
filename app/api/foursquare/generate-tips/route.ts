import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY
})

interface StructuredTip {
  category: 'timing' | 'food' | 'secrets' | 'protips' | 'access' | 'savings' | 'recommendations' | 'hidden'
  tip: string
  priority: 'high' | 'medium' | 'low'
  isVerified: boolean
  source: 'ai_generated' | 'user_submitted' | 'business_provided' | 'staff_verified'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('🤖 Foursquare Tips Generator - Request:', body)
    
    const { locationName, website, categories, description } = body

    if (!locationName) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      )
    }

    // Generate insider tips using AI
    const tips = await generateInsiderTips({
      locationName,
      website,
      categories,
      description
    })

    console.log('✅ Generated tips:', tips)

    return NextResponse.json({
      success: true,
      tips,
      count: tips.length
    })

  } catch (error) {
    console.error('❌ Error generating tips:', error)
    return NextResponse.json(
      { error: 'Failed to generate insider tips' },
      { status: 500 }
    )
  }
}

async function generateInsiderTips({
  locationName,
  website,
  categories,
  description
}: {
  locationName: string
  website?: string
  categories?: string[]
  description?: string
}): Promise<StructuredTip[]> {
  try {
    // Create a comprehensive prompt
    const categoryText = categories && categories.length > 0 ? categories.join(', ') : 'general location'
    const websiteText = website ? `Website: ${website}` : ''
    const descriptionText = description ? `Description: ${description}` : ''
    
    const prompt = `Generate 5-8 insider tips for "${locationName}", a ${categoryText} location.

${websiteText}
${descriptionText}

Create practical, specific tips that only locals would know. Format as a JSON array with this structure:
[
  {
    "category": "timing|food|secrets|protips|access|savings|recommendations|hidden",
    "tip": "Specific actionable tip",
    "priority": "high|medium|low"
  }
]

Categories:
- timing: Best times to visit, avoid crowds
- food: Food/drink recommendations, menu secrets
- secrets: Hidden features, local knowledge
- protips: Expert advice, how to get the most out of visit
- access: Parking, transportation, entry tips
- savings: Money-saving tips, deals, free options
- recommendations: What to order/try, must-see items
- hidden: Secret spots, lesser-known features

Make tips specific to this location, not generic advice. Focus on actionable information.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a local expert who knows insider secrets about places. Generate specific, actionable tips that would be valuable to visitors."
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

    // Parse the JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON array found in response')
    }

    const rawTips = JSON.parse(jsonMatch[0])
    
    // Convert to our structured format
    const structuredTips: StructuredTip[] = rawTips.map((tip: any) => ({
      category: tip.category || 'protips',
      tip: tip.tip || '',
      priority: tip.priority || 'medium',
      isVerified: false,
      source: 'ai_generated' as const
    }))

    return structuredTips

  } catch (error) {
    console.error('Error generating tips:', error)
    
    // Return fallback tips
    return generateFallbackTips(locationName, categories?.[0])
  }
}

function generateFallbackTips(locationName: string, category?: string): StructuredTip[] {
  const fallbackTips: StructuredTip[] = [
    {
      category: 'timing',
      tip: 'Visit during weekday mornings for a quieter experience',
      priority: 'medium',
      isVerified: false,
      source: 'ai_generated'
    },
    {
      category: 'protips',
      tip: 'Check their social media for current specials and updates',
      priority: 'medium',
      isVerified: false,
      source: 'ai_generated'
    },
    {
      category: 'access',
      tip: 'Look for street parking or nearby public parking options',
      priority: 'low',
      isVerified: false,
      source: 'ai_generated'
    }
  ]

  // Add category-specific tips
  if (category) {
    if (category.toLowerCase().includes('restaurant') || category.toLowerCase().includes('food')) {
      fallbackTips.push({
        category: 'food',
        tip: 'Ask about daily specials not listed on the menu',
        priority: 'high',
        isVerified: false,
        source: 'ai_generated'
      })
    }
    
    if (category.toLowerCase().includes('shop') || category.toLowerCase().includes('retail')) {
      fallbackTips.push({
        category: 'savings',
        tip: 'Sign up for their newsletter for exclusive discounts',
        priority: 'medium',
        isVerified: false,
        source: 'ai_generated'
      })
    }
  }

  return fallbackTips
} 