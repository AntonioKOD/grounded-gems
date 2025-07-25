import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getServerSideUser } from '@/lib/auth-server'

// Helper function to get user from either cookies or Bearer token
async function getCurrentUser(request: NextRequest) {
  try {
    // First try Bearer token (for mobile apps)
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const payload = await getPayload({ config })
      const { user } = await payload.auth({ headers: request.headers })
      if (user) {
        return user
      }
    }

    // Fallback to cookie-based auth (for web apps)
    return await getServerSideUser()
  } catch (error) {
    console.log('Authentication failed:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { input, context, coordinates } = body

    if (!input || !context) {
      return NextResponse.json(
        { error: 'Input and context are required' },
        { status: 400 }
      )
    }

    // Call the existing AI planner logic
    const payload = await getPayload({ config })
    
    // Get user preferences
    const userPreferences = getUserPreferencesForContext(user, context)
    
    // Get nearby locations if coordinates provided
    let nearbyLocations: any[] = []
    let userLocation = 'Unknown location'
    let usedRealLocations = false
    let referencedLocationIds: string[] = []
    
    if (coordinates?.latitude && coordinates?.longitude) {
      try {
        // Find nearby locations within 20 miles
        const locations = await payload.find({
          collection: 'locations',
          where: {
            and: [
              {
                'coordinates.latitude': {
                  greater_than: coordinates.latitude - 0.3, // ~20 miles
                  less_than: coordinates.latitude + 0.3
                }
              },
              {
                'coordinates.longitude': {
                  greater_than: coordinates.longitude - 0.3,
                  less_than: coordinates.longitude + 0.3
                }
              },
              {
                status: {
                  equals: 'published'
                }
              }
            ]
          },
          limit: 50,
          depth: 1
        })
        
        nearbyLocations = locations.docs
        usedRealLocations = nearbyLocations.length > 0
        
        // Get user location name (simplified)
        userLocation = `Near ${coordinates.latitude.toFixed(2)}, ${coordinates.longitude.toFixed(2)}`
        
      } catch (error) {
        console.error('Error fetching nearby locations:', error)
      }
    }
    
    // Select best locations for context
    const selectedLocations = selectBestLocationsForContext(nearbyLocations, context, user.preferences?.categories || [])
    referencedLocationIds = selectedLocations.map(loc => loc.id)
    
    // Create location context for AI
    const locationContext = selectedLocations.length > 0 
      ? `\n📍 **VERIFIED LOCATIONS NEAR YOU** (Use these in your plan):\n${selectedLocations.map(loc => 
          `- ${loc.name} (${loc.address || 'Address available'}) - ${loc.categories?.join(', ') || 'Various categories'}`
        ).join('\n')}`
      : '\n📍 **No verified locations found nearby** - Suggest general types of places'
    
    // Enhanced AI prompt
    const now = new Date()
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' })
    const timeOfDay = getTimeOfDay(now)
    const season = getSeason(now)
    
    const planningInstructions = `
🎯 CRITICAL PLANNING INSTRUCTIONS - READ CAREFULLY:

1. **DATABASE LOCATIONS ARE MANDATORY**: If verified locations are provided below, you MUST use them as the foundation of your plan.
2. **MINIMUM USAGE REQUIREMENT**: Use AT LEAST ${selectedLocations.length > 0 ? Math.min(selectedLocations.length, 3) : 0} verified locations if available.
3. **EXACT NAMING**: Reference verified locations by their EXACT NAMES as listed, followed by "(Verified Sacavia Location)".
4. **LOCATION PRIORITY**: Always prioritize verified locations over generic suggestions.
5. **REALISTIC LOGISTICS**: Consider timing, travel between locations, and realistic scheduling.
6. **COMPLETE DETAILS**: Include specific addresses (for verified locations), estimated costs, and timing.
7. **INSIDER VALUE**: Use insider tips and specific recommendations when available from verified locations.
8. **FALLBACK LABELING**: Only if you suggest a type of place not in the verified list, label it as "(Find a local spot for this)".
9. **QUALITY OVER QUANTITY**: Better to have fewer steps with verified locations than many generic ones.
10. **USER EXPERIENCE**: Make the plan feel like a local insider's recommendation.`

    const basePrompt = `You are Gem Journey, the expert local experience planner who creates amazing, actionable hangout plans using REAL, VERIFIED locations from Sacavia's database.

🎯 **USER REQUEST**: "${input}"
📝 **HANGOUT TYPE**: ${context}
📍 **USER LOCATION**: ${userLocation}
🗓️ **DAY & TIME**: ${dayOfWeek}, ${timeOfDay}
🌍 **SEASON**: ${season}
👤 **USER PREFERENCES**: ${userPreferences}
${locationContext}

${planningInstructions}

🔥 **RESPONSE FORMAT** (JSON ONLY - NO OTHER TEXT):
{
  "title": "Engaging, specific plan title (include location names if using verified locations)",
  "summary": "Brief, exciting description (mention real places by name if used)",
  "steps": [
    "Step 1: [Time] - [Specific action] at [Exact location name] [Label] - [Description/tip, address if verified, cost estimate]",
    "Step 2: [Time] - [Specific action] at [Exact location name] [Label] - [Description/tip, address if verified, cost estimate]"
  ],
  "context": "${context}",
  "usedRealLocations": ${usedRealLocations},
  "locationIds": ${JSON.stringify(referencedLocationIds)},
  "verifiedLocationCount": ${selectedLocations.length}
}`

    // Call OpenAI API
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPEN_AI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: `You are Gem Journey, a world-class local experience planner. You specialize in creating personalized hangout plans using REAL, VERIFIED locations from Sacavia's database. 

CRITICAL RULES:
1. ALWAYS prioritize verified database locations when available
2. Use EXACT location names followed by "(Verified Sacavia Location)"
3. Only use generic suggestions when no verified options exist
4. Focus on creating memorable, actionable experiences
5. RESPOND ONLY IN JSON FORMAT - NO OTHER TEXT` 
          },
          { role: 'user', content: basePrompt },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      })
    })

    if (!openaiRes.ok) {
      const error = await openaiRes.text()
      console.error('❌ OpenAI API error:', error)
      
      let errorMessage = 'AI planning service temporarily unavailable'
      if (openaiRes.status === 401) {
        errorMessage = 'AI service authentication failed'
      } else if (openaiRes.status === 429) {
        errorMessage = 'AI service is currently busy. Please wait a moment and try again.'
      } else if (openaiRes.status >= 500) {
        errorMessage = 'AI service is experiencing issues. Please try again later.'
      }
      
      return NextResponse.json({ 
        success: false,
        error: errorMessage,
        code: 'OPENAI_ERROR'
      }, { status: 503 })
    }
    
    const data = await openaiRes.json()
    let planRaw = data.choices?.[0]?.message?.content || ''
    
    // Parse the plan
    let plan
    try {
      // Clean the response to extract JSON
      const jsonMatch = planRaw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No valid JSON found in response')
      }
    } catch (parseError) {
      console.error('❌ Plan parsing error:', parseError)
      return NextResponse.json({
        success: false,
        error: 'Failed to parse AI response',
        code: 'PARSE_ERROR'
      }, { status: 500 })
    }
    
    // Validate plan structure
    if (!plan.title || !plan.steps || !Array.isArray(plan.steps)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid plan structure received from AI',
        code: 'INVALID_PLAN'
      }, { status: 500 })
    }
    
    // Add metadata
    plan.generatedAt = new Date().toISOString()
    plan.nearbyLocationsFound = nearbyLocations.length
    plan.userLocation = userLocation
    
    return NextResponse.json({
      success: true,
      message: 'Plan generated successfully',
      plan,
      nearbyLocationsFound: nearbyLocations.length,
      userLocation,
      verifiedLocationsUsed: usedRealLocations
    })

  } catch (error) {
    console.error('❌ Mobile AI planner error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate plan',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// Helper functions
function getUserPreferencesForContext(user: any, context: string): string {
  const preferences = []
  
  if (user.preferences?.categories?.length > 0) {
    preferences.push(`Interests: ${user.preferences.categories.join(', ')}`)
  }
  
  if (user.preferences?.radius) {
    preferences.push(`Travel radius: ${user.preferences.radius} miles`)
  }
  
  if (user.preferences?.budgetPreference) {
    preferences.push(`Budget: ${user.preferences.budgetPreference}`)
  }
  
  return preferences.length > 0 ? preferences.join(', ') : 'No specific preferences set'
}

function selectBestLocationsForContext(
  locations: any[], 
  context: string, 
  userInterests: string[] = []
): any[] {
  if (locations.length === 0) return []
  
  // Score locations based on context and user interests
  const scoredLocations = locations.map(location => {
    let score = 0
    
    // Context matching
    const contextKeywords = getContextKeywords(context)
    const locationText = `${location.name} ${location.description || ''} ${location.categories?.join(' ') || ''}`.toLowerCase()
    
    contextKeywords.forEach(keyword => {
      if (locationText.includes(keyword)) {
        score += 2
      }
    })
    
    // User interests matching
    userInterests.forEach(interest => {
      if (locationText.includes(interest.toLowerCase())) {
        score += 1
      }
    })
    
    // Rating boost
    if (location.rating) {
      score += location.rating / 5
    }
    
    // Verification boost
    if (location.isVerified) {
      score += 1
    }
    
    return { ...location, score }
  })
  
  // Sort by score and return top locations
  return scoredLocations
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(location => ({ ...location, score: undefined })) // Remove score from final result
}

function getContextKeywords(context: string): string[] {
  const keywordMap: Record<string, string[]> = {
    casual: ['casual', 'relaxed', 'chill', 'comfortable'],
    date: ['romantic', 'intimate', 'date', 'couple', 'romance'],
    family: ['family', 'kid', 'child', 'children', 'family-friendly'],
    friends: ['social', 'group', 'friends', 'hangout', 'party'],
    solo: ['solo', 'individual', 'personal', 'alone'],
    business: ['business', 'professional', 'meeting', 'work'],
    celebration: ['celebration', 'party', 'birthday', 'anniversary', 'special'],
    cultural: ['cultural', 'art', 'museum', 'theater', 'gallery', 'history']
  }
  
  return keywordMap[context] || []
}

function getTimeOfDay(date: Date): string {
  const hour = date.getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

function getSeason(date: Date): string {
  const month = date.getMonth()
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'fall'
  return 'winter'
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
} 