import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
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
  let user = null
  let safeContext: string = "error"
  
  try {
    // Enhanced authentication with better error handling
    user = await getCurrentUser(request)
    if (!user) {
      console.log('❌ Mobile AI Planner: No authenticated user')
      return NextResponse.json({ 
        error: 'Authentication required to use AI Planner',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }
    
    console.log(`✅ Mobile AI Planner: Authenticated user ${user.id} (${user.name})`)

    const body = await request.json()
    const { input, context, coordinates } = body
    safeContext = context || "error"
    
    console.log('🎯 Mobile AI Planner Request:', {
      userId: user.id,
      input: input?.substring(0, 100),
      context,
      hasCoordinates: !!coordinates,
      coordinates: coordinates ? `${coordinates.latitude}, ${coordinates.longitude}` : null
    })
    
    // Validate required parameters
    if (!input || !context) {
      return NextResponse.json({
        error: 'Missing required parameters: input and context are required',
        code: 'MISSING_PARAMS'
      }, { status: 400 })
    }
    
    // Get real location data if coordinates are provided
    let nearbyLocations: any[] = []
    let locationContext = ''
    let userLocation = 'your area'
    let usedRealLocations = false
    let referencedLocationIds: string[] = []
    let locationFetchError = null
    
    if (coordinates?.latitude && coordinates?.longitude) {
      try {
        console.log(`📍 Fetching locations near ${coordinates.latitude}, ${coordinates.longitude}`)
        const payload = await getPayload({ config })
        
        // Fetch user data for preferences with timeout
        let userData = null
        try {
          userData = await Promise.race([
            payload.findByID({
              collection: 'users',
              id: user.id,
              depth: 1
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('User fetch timeout')), 3000))
          ])
        } catch (userError) {
          console.warn('⚠️ User data fetch failed, continuing without preferences:', userError)
        }
        
        // Enhanced location query with better filtering and error handling
        console.log('🔍 Querying locations with coordinates:', coordinates)
        
        // First, let's get ALL published locations to see what we have
        const allLocationsResult = await Promise.race([
          payload.find({
          collection: 'locations',
          where: {
              status: { equals: 'published' }
            },
            limit: 200,
            depth: 2,
            sort: '-updatedAt'
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Location fetch timeout')), 5000))
        ]) as { docs: any[] }
        
        console.log(`📊 Found ${allLocationsResult.docs.length} total published locations in database`)
        
        // Log some sample locations to debug
        if (allLocationsResult.docs.length > 0) {
          console.log('📋 Sample locations:')
          allLocationsResult.docs.slice(0, 3).forEach((loc, index) => {
            console.log(`  ${index + 1}. ${loc.name} - Coords: ${loc.coordinates?.latitude}, ${loc.coordinates?.longitude} - Status: ${loc.status}`)
          })
        }
        
        // Filter locations with coordinates
        const allLocations = allLocationsResult.docs.filter(loc => 
          loc.coordinates?.latitude && 
          loc.coordinates?.longitude && 
          loc.name && 
          loc.name.trim() !== ''
        )
        
        console.log(`📍 Found ${allLocations.length} locations with valid coordinates`)
        
        // Enhanced distance calculation with better filtering and error handling
        console.log('🧮 Calculating distances from user coordinates:', coordinates)
        
        const locationsWithDistance = allLocations
          .map((location: any) => {
            try {
              const locLat = location.coordinates?.latitude
              const locLng = location.coordinates?.longitude
              
              if (!locLat || !locLng || !location.name) {
                console.log(`⚠️ Skipping location ${location.name || 'unnamed'} - missing coordinates or name`)
                return null
              }
              
              // Validate coordinate values are numbers
              const lat = Number(locLat)
              const lng = Number(locLng)
              const userLat = Number(coordinates.latitude)
              const userLng = Number(coordinates.longitude)
              
              if (isNaN(lat) || isNaN(lng) || isNaN(userLat) || isNaN(userLng)) {
                console.log(`⚠️ Skipping location ${location.name} - invalid coordinate values`)
                return null
              }
              
              // Haversine distance calculation
              const R = 3959 // Earth's radius in miles
              const dLat = (lat - userLat) * Math.PI / 180
              const dLon = (lng - userLng) * Math.PI / 180
              const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(userLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2)
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
              const distance = R * c
              
              return {
                ...location,
                distance
              }
            } catch (error) {
              console.log(`⚠️ Error calculating distance for location ${location.name || 'unnamed'}:`, error)
              return null
            }
          })
          .filter((loc: any) => loc && loc.distance <= 50) // Increased to 50 miles for better coverage
          .sort((a: any, b: any) => a.distance - b.distance)
        
        nearbyLocations = locationsWithDistance
        console.log(`📍 Found ${nearbyLocations.length} locations within 50 miles`)
        
        // Log the closest locations for debugging
        if (nearbyLocations.length > 0) {
          console.log('🎯 Closest locations:')
          nearbyLocations.slice(0, 5).forEach((loc, index) => {
            console.log(`  ${index + 1}. ${loc.name} - ${loc.distance.toFixed(1)} miles away`)
          })
        } else {
          console.log('⚠️ No locations found within 50 miles - this might indicate:')
          console.log('  1. No locations in database')
          console.log('  2. Locations missing coordinates')
          console.log('  3. User coordinates are invalid')
          console.log('  4. All locations are too far away')
        }
        
        // Create detailed location context for AI - MANDATORY USAGE
        if (nearbyLocations.length > 0) {
          usedRealLocations = true
          
          // Determine user location from nearest location
          const firstLocation = nearbyLocations[0]
          if (firstLocation.address?.city && firstLocation.address?.state) {
            userLocation = `${firstLocation.address.city}, ${firstLocation.address.state}`
          } else if (firstLocation.address?.city) {
            userLocation = firstLocation.address.city
          } else if (typeof firstLocation.address === 'string' && firstLocation.address) {
            userLocation = firstLocation.address.split(',')[0] || 'your area'
          }
          
          // Enhanced location selection - prioritize based on context and quality
          const selectedLocations = selectBestLocationsForContext(
            nearbyLocations, 
            context, 
            (userData && typeof userData === 'object' && userData !== null && 'interests' in userData && Array.isArray((userData as any).interests)) ? (userData as any).interests : [],
            input // Pass the user input for better matching
          )
          referencedLocationIds = selectedLocations.map(loc => loc.id)
          
          console.log(`🎯 Selected ${selectedLocations.length} best locations for AI context`)
        } else if (allLocations.length > 0) {
          // Fallback: use all locations if no nearby ones found
          console.log('🔄 No nearby locations found, using all available locations as fallback')
          usedRealLocations = true
          userLocation = 'your area'
          
          const selectedLocations = selectBestLocationsForContext(
            allLocations, 
            context, 
            (userData && typeof userData === 'object' && userData !== null && 'interests' in userData && Array.isArray((userData as any).interests)) ? (userData as any).interests : [],
            input
          )
          referencedLocationIds = selectedLocations.map(loc => loc.id)
          
          console.log(`🎯 Selected ${selectedLocations.length} locations from all available (fallback)`)
        } else {
          console.log('⚠️ No locations found in database at all')
          usedRealLocations = false
          userLocation = 'your area'
        }
        
        // Enhanced location formatting for AI with MANDATORY usage instruction
        if (referencedLocationIds.length > 0) {
          const selectedLocations = allLocations.filter(loc => referencedLocationIds.includes(loc.id))
          
          const locationDescriptions = selectedLocations.map((loc: any) => {
            const address = formatLocationAddress(loc.address)
            const categories = formatLocationCategories(loc.categories)
            const rating = loc.averageRating ? `${loc.averageRating.toFixed(1)}/5 (${loc.reviewCount || 0} reviews)` : 'No ratings yet'
            const hours = formatBusinessHours(loc.businessHours)
            const priceRange = formatPriceRange(loc.priceRange)
            const contact = loc.contactInfo?.phone ? ` | Phone: ${loc.contactInfo.phone}` : ''
            const website = loc.contactInfo?.website ? ` | Website: ${loc.contactInfo.website}` : ''
            const tips = loc.insiderTips ? ` | Insider Tips: ${loc.insiderTips}` : ''
            const verified = loc.isVerified ? ' ✓ VERIFIED' : ''
            const distance = loc.distance ? ` - ${loc.distance.toFixed(1)} miles away` : ''
            
            return `${loc.name}${verified} (${categories}) - ${address}${distance}
   Rating: ${rating} | Price: ${priceRange} | Hours: ${hours}${contact}${website}${tips}`
          }).join('\n\n')
          
          locationContext = `\n\n🎯 MANDATORY VERIFIED LOCATIONS TO USE IN YOUR PLAN:
${locationDescriptions}

⚠️ CRITICAL INSTRUCTION: You MUST use AT LEAST ${Math.min(selectedLocations.length, 3)} of these verified locations in your plan. Each step using a verified location MUST include the exact location name.`
        } else {
          locationContext = '\n\n⚠️ NO VERIFIED LOCATIONS AVAILABLE: Create general suggestions with location types and clearly label them as "(Find a local spot for this)".'
        }
        
      } catch (locationError) {
        console.error('❌ Error fetching nearby locations:', locationError)
        locationFetchError = locationError instanceof Error ? locationError.message : String(locationError)
        // Continue with general planning if location fetch fails
      }
    }
    
    // Enhanced user preferences and context detection
    const detectedContext = detectContextFromInput(input, context)
    const userPreferences = getUserPreferencesForContext(user, detectedContext)
    
    // Get current time and context
    const now = new Date()
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' })
    const timeOfDay = getTimeOfDay(now)
    const season = getSeason(now)
    
    // ENHANCED PLANNING INSTRUCTIONS - CONVERSATIONAL AGENT BEHAVIOR
    let planningInstructions = `
🎯 GEM AGENT INSTRUCTIONS - YOUR PERSONAL LOCAL ASSISTANT:

1. **CONVERSATIONAL TONE**: Respond like a knowledgeable local friend having a natural conversation.
2. **DATABASE LOCATIONS ARE MANDATORY**: If verified locations are provided below, you MUST use them as the foundation of your recommendations.
3. **MINIMUM USAGE REQUIREMENT**: Use AT LEAST ${nearbyLocations.length > 0 ? Math.min(nearbyLocations.length, 3) : 0} verified locations if available.
4. **EXACT NAMING**: Reference verified locations by their EXACT NAMES as listed.
5. **LOCATION PRIORITY**: Always prioritize verified locations over generic suggestions.
6. **CONVERSATIONAL SUGGESTIONS**: Instead of timeline steps, provide natural recommendations like "I'd recommend checking out..." or "Another great option is..."
7. **INSIDER VALUE**: Use insider tips and specific recommendations when available from verified locations.
8. **FALLBACK LABELING**: Only if you suggest a type of place not in the verified list, label it as "(Find a local spot for this)".
9. **AGENT PERSONALITY**: Be conversational, helpful, and knowledgeable - like a local friend giving recommendations.
10. **NATURAL LANGUAGE**: Understand requests like "I want to take the kids in Boston" and provide relevant suggestions.
11. **CONVERSATION FLOW**: Make it feel like a natural conversation, not a structured plan.`

    let suggestionCountGuidance = "Provide 3-5 conversational recommendations."

    if (nearbyLocations.length > 0) {
      planningInstructions += `

🏆 **VERIFIED LOCATIONS AVAILABLE**: You have ${nearbyLocations.length} real verified locations nearby. 
**MANDATORY**: Your suggestions MUST use at least ${Math.min(nearbyLocations.length, 3)} of these verified locations.
**SUCCESS CRITERIA**: Each verified location used should be clearly identified by name.`
      
      if (nearbyLocations.length <= 2) {
        suggestionCountGuidance = "Provide 2-3 conversational recommendations, focusing primarily on the verified locations."
      } else if (nearbyLocations.length <= 4) {
        suggestionCountGuidance = "Provide 3-4 conversational recommendations, integrating multiple verified locations."
      } else {
        suggestionCountGuidance = "Provide 4-5 conversational recommendations, showcasing the best verified locations."
      }
    } else {
      planningInstructions += `

⚠️ **NO VERIFIED LOCATIONS**: No database locations found nearby. Create general suggestions with location types and clearly label them as "(Find a local spot for this)".`
      suggestionCountGuidance = "Provide 3-4 general suggestions with location type recommendations."
    }
    
    planningInstructions += `\n\n💬 **SUGGESTION COUNT**: ${suggestionCountGuidance}`

    // Enhanced AI prompt for Gem Agent - Your Personal Local Assistant
    const basePrompt = `You are Gem Agent, your personal local assistant and experience curator. You're like having a knowledgeable local friend who knows all the best spots and can help you discover amazing experiences.

🎯 **USER REQUEST**: "${input}"
📍 **USER LOCATION**: ${userLocation}
🗓️ **DAY & TIME**: ${dayOfWeek}, ${timeOfDay}
🌍 **SEASON**: ${season}
👤 **USER PREFERENCES**: ${userPreferences}
${locationContext}

${planningInstructions}

🔥 **RESPONSE FORMAT** (JSON ONLY - NO OTHER TEXT):
{
  "title": "Personalized recommendations for your request",
  "summary": "Here are my suggestions based on what you're looking for:",
  "steps": [
    "I'd recommend checking out [Exact location name] - [Description with insider tips, address if verified]",
    "Another great option is [Exact location name] - [Description with insider tips, address if verified]",
    "For [activity type], you might enjoy [Exact location name] - [Description with insider tips, address if verified]"
  ],
  "context": "${context}",
  "usedRealLocations": ${usedRealLocations},
  "locationIds": ${JSON.stringify(referencedLocationIds)},
  "verifiedLocationCount": ${nearbyLocations.length}
}`

    // Enhanced OpenAI API call with better error handling
    console.log('🤖 Calling OpenAI API...')
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
            content: `You are Gem Agent, your personal local assistant and experience curator. You're like having a knowledgeable local friend who knows all the best spots and can help you discover amazing experiences.

CRITICAL RULES:
1. ALWAYS prioritize verified database locations when available
2. Use EXACT location names as listed
3. Only use generic suggestions when no verified options exist
4. Focus on creating memorable, actionable experiences
5. Be conversational and helpful - like a local friend giving recommendations
6. Understand natural language requests (e.g., "I want to take the kids in Boston")
7. Provide relevant suggestions based on the user's intent, not just structured planning
8. Use conversational language like "I'd recommend..." or "Another great option is..."
9. RESPOND ONLY IN JSON FORMAT - NO OTHER TEXT` 
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
      
      // Enhanced error handling with specific status codes
      let errorMessage = 'AI planning service temporarily unavailable'
      if (openaiRes.status === 401) {
        errorMessage = 'AI service authentication failed - please contact support'
      } else if (openaiRes.status === 429) {
        errorMessage = 'AI service is currently busy. Please wait a moment and try again.'
      } else if (openaiRes.status >= 500) {
        errorMessage = 'AI service is experiencing issues. Please try again later.'
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        code: 'OPENAI_ERROR',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }, { status: 503 })
    }
    
    const data = await openaiRes.json()
    let planRaw = data.choices?.[0]?.message?.content || ''
    let plan
    
    console.log('🤖 AI Response received, parsing...')
    
    try {
      // Enhanced JSON parsing with better error handling
      const jsonStart = planRaw.indexOf('{')
      const jsonEnd = planRaw.lastIndexOf('}') + 1
      if (jsonStart === -1 || jsonEnd === -1 || jsonStart > jsonEnd) {
        throw new Error("Valid JSON structure not found in AI response.")
      }
      
      const jsonString = planRaw.slice(jsonStart, jsonEnd)
      plan = JSON.parse(jsonString)
      
      // Enhanced validation of required fields
      if (!plan.title || !plan.summary || !Array.isArray(plan.steps)) {
        throw new Error("AI response missing required fields")
      }
      
      if (plan.steps.length === 0) {
        throw new Error("AI response has no steps")
      }
      
      // CRITICAL: Validate that verified locations were used if available
      if (nearbyLocations.length > 0) {
        // Check if any of the selected location names appear in the steps
        const selectedLocationNames = nearbyLocations
          .filter(loc => referencedLocationIds.includes(loc.id))
          .map(loc => loc.name.toLowerCase())
        
        const verifiedLocationUsage = plan.steps.filter((step: string) => 
          selectedLocationNames.some(name => step.toLowerCase().includes(name))
        ).length
        
        console.log(`🎯 Verified location usage check: ${verifiedLocationUsage}/${nearbyLocations.length} available locations used`)
        
        // Force verification if AI didn't use enough database locations
        if (verifiedLocationUsage === 0) {
          console.warn('⚠️ AI did not use any verified locations, this should not happen!')
          plan.usedRealLocations = false
      } else {
          plan.usedRealLocations = true
        }
      }
      
      // Add comprehensive metadata
      plan.coordinates = coordinates
      plan.nearbyLocationsCount = nearbyLocations.length
      // Get selected location names for verification
      const selectedLocationNames = nearbyLocations
        .filter(loc => referencedLocationIds.includes(loc.id))
        .map(loc => loc.name.toLowerCase())
      
      plan.verifiedLocationsUsed = plan.steps.filter((step: string) => 
        selectedLocationNames.some(name => step.toLowerCase().includes(name))
      ).length
      plan.generatedAt = new Date().toISOString()
      plan.locationIds = referencedLocationIds
      plan.userLocation = userLocation
      plan.locationFetchError = locationFetchError
      
      console.log('✅ Gem Agent recommendation generated successfully:', {
        title: plan.title,
        stepsCount: plan.steps.length,
        nearbyLocations: nearbyLocations.length,
        verifiedUsed: plan.verifiedLocationsUsed,
        usedRealLocations: plan.usedRealLocations
      })
      
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError)
      console.log('Raw AI response:', planRaw.substring(0, 500))
      
      // Enhanced fallback with database location injection
      let extractedTitle = `${context.charAt(0).toUpperCase() + context.slice(1)} Hangout Plan`
      let extractedSummary = 'Here is a customized plan based on your request.'
      let stepsArray: string[] = []
      
      // Try to inject database locations into fallback
      if (nearbyLocations.length > 0) {
        extractedTitle = `Local ${context.charAt(0).toUpperCase() + context.slice(1)} Experience in ${userLocation}`
        extractedSummary = `A curated plan featuring ${nearbyLocations.length} verified local spots near ${userLocation}.`
        
        // Create simple steps using database locations
        nearbyLocations.slice(0, 3).forEach((location, index) => {
          const categories = formatLocationCategories(location.categories)
          const address = formatLocationAddress(location.address)
          stepsArray.push(
            `Step ${index + 1}: Visit ${location.name} - ${categories} located at ${address}. Distance: ${location.distance.toFixed(1)} miles.`
          )
        })
        
        if (stepsArray.length === 0) {
          stepsArray = ["We encountered an issue processing the AI response. Please try again with a different request."]
        }
      } else {
        stepsArray = ["The AI generated a plan, but there was an issue formatting the steps. Please try rephrasing your request for better results."]
      }

      plan = { 
        title: extractedTitle, 
        summary: extractedSummary, 
        steps: stepsArray,
        context,
        usedRealLocations: nearbyLocations.length > 0,
        locationIds: nearbyLocations.slice(0, 3).map(loc => loc.id),
        verifiedLocationsUsed: nearbyLocations.length > 0 ? Math.min(3, nearbyLocations.length) : 0,
        coordinates,
        generatedAt: new Date().toISOString(),
        userLocation,
        nearbyLocationsCount: nearbyLocations.length,
        parseError: true,
        locationFetchError
      }
    }
    
    const response = {
      plan,
      nearbyLocationsFound: nearbyLocations.length,
      userLocation,
      usedRealLocations: plan.usedRealLocations,
      verifiedLocationsUsed: plan.verifiedLocationsUsed || 0,
      success: true
    }
    
    console.log('🎉 Gem Agent completed successfully:', {
      nearbyLocations: nearbyLocations.length,
      verifiedUsed: response.verifiedLocationsUsed,
      usedReal: response.usedRealLocations
    })
    
    return NextResponse.json(response)
    
  } catch (err: any) {
    console.error('❌ Mobile AI Planner critical error:', err)
    
    // Enhanced error handling with specific error types
    let errorMessage = 'Failed to generate plan'
    let statusCode = 500
    
    if (err.message?.includes('fetch') || err.message?.includes('network')) {
      errorMessage = 'Network connectivity issue. Please check your connection and try again.'
    } else if (err.message?.includes('timeout')) {
      errorMessage = 'Request timed out. Please try again.'
      statusCode = 408
    } else if (err.message?.includes('JSON')) {
      errorMessage = 'Error processing AI response. Please try again.'
    } else if (err.message?.includes('rate limit') || err.message?.includes('too many requests')) {
      errorMessage = 'Too many requests. Please wait a moment and try again.'
      statusCode = 429
    } else {
      errorMessage = `Failed to generate plan: ${err?.message || 'Unknown error'}`
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      code: 'CRITICAL_ERROR',
      plan: {
        title: "Plan Generation Error",
        summary: "We encountered an issue while trying to generate your plan. Our team has been notified.",
        steps: ["Please try rephrasing your request or contact support if the issue persists."],
        context: safeContext,
        usedRealLocations: false,
        locationIds: [],
        generatedAt: new Date().toISOString(),
        userLocation: "N/A",
        nearbyLocationsCount: 0,
        error: true
      },
      success: false
    }, { status: statusCode })
  }
}

// Enhanced helper functions
function selectBestLocationsForContext(
  locations: any[], 
  context: string, 
  userInterests: string[] = [],
  userInput: string = ''
) {
  try {
    const contextKeywords = getContextKeywords(context)
    const interestKeywords = userInterests.flatMap(interest => interest.toLowerCase().split(' '))
    const inputKeywords = userInput.toLowerCase().split(' ').filter(word => word.length > 3)
    
    const scoredLocations = locations.map(loc => {
      try {
        let score = 0
        
        const locText = `${loc.name || ''} ${loc.description || ''} ${formatLocationCategories(loc.categories)}`.toLowerCase()
        
        // Score based on context relevance (highest priority)
        contextKeywords.forEach(keyword => {
          if (locText.includes(keyword)) score += 5
        })
        
        // Score based on user input keywords
        inputKeywords.forEach(keyword => {
          if (locText.includes(keyword)) score += 4
        })
        
        // Score based on user interests
        interestKeywords.forEach(interest => {
          if (locText.includes(interest)) score += 3
        })
        
        // Bonus for quality indicators
        if (loc.isVerified) score += 3
        if (loc.averageRating >= 4.5) score += 2
        else if (loc.averageRating >= 4.0) score += 1
        if (loc.isFeatured) score += 2
        if (loc.insiderTips) score += 1
        
        // Distance penalty (closer is better)
        score -= (loc.distance || 0) * 0.2
        
        return { ...loc, score }
      } catch (error) {
        console.log(`⚠️ Error scoring location ${loc.name || 'unnamed'}:`, error)
        return { ...loc, score: 0 }
      }
    })
    
    // Return diverse selection of top scored locations
    return scoredLocations
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(12, locations.length)) // Increased for better selection
  } catch (error) {
    console.log('⚠️ Error in selectBestLocationsForContext:', error)
    return locations.slice(0, Math.min(12, locations.length))
  }
}

function getContextKeywords(context: string): string[] {
  const contextMap: { [key: string]: string[] } = {
    'date': ['romantic', 'dinner', 'restaurant', 'cafe', 'wine', 'intimate', 'cozy', 'view', 'fine dining', 'cocktail'],
    'friends': ['bar', 'restaurant', 'activity', 'entertainment', 'game', 'music', 'social', 'brewery', 'lounge'],
    'family': ['family', 'kid', 'child', 'park', 'museum', 'outdoor', 'activity', 'fun', 'playground', 'interactive', 'children', 'family-friendly', 'educational', 'safe'],
    'solo': ['cafe', 'book', 'quiet', 'park', 'museum', 'walk', 'peaceful', 'solo', 'library', 'gallery'],
    'business': ['restaurant', 'cafe', 'meeting', 'professional', 'quiet', 'business', 'formal'],
    'celebration': ['restaurant', 'bar', 'party', 'celebration', 'fun', 'entertainment', 'special'],
    'cultural': ['museum', 'art', 'culture', 'theater', 'gallery', 'history', 'educational', 'exhibition'],
    'casual': ['restaurant', 'cafe', 'activity', 'entertainment', 'fun', 'social', 'food']
  }
  
  return contextMap[context] || ['entertainment', 'food', 'activity', 'social']
}

function formatLocationAddress(address: any): string {
  try {
    if (typeof address === 'string') return address
    if (!address) return 'Address not available'
    
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zip
    ].filter(Boolean)
    
    return parts.join(', ') || 'Address not available'
  } catch (error) {
    console.log('⚠️ Error formatting address:', error)
    return 'Address not available'
  }
}

function formatLocationCategories(categories: any[]): string {
  try {
    if (!categories || !Array.isArray(categories)) return 'General'
    
    return categories
      .map(cat => typeof cat === 'string' ? cat : cat?.name || 'Category')
      .join(', ') || 'General'
  } catch (error) {
    console.log('⚠️ Error formatting categories:', error)
    return 'General'
  }
}

function formatBusinessHours(hours: any[]): string {
  if (!hours || !Array.isArray(hours) || hours.length === 0) return 'Hours vary'
  
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayHours = hours.find(h => h.day === today)
  
  if (todayHours) {
    if (todayHours.closed) return 'Closed today'
    if (todayHours.open && todayHours.close) {
      return `Today: ${todayHours.open} - ${todayHours.close}`
    }
  }
  
  return 'Check hours'
}

function formatPriceRange(priceRange: string): string {
  const ranges: { [key: string]: string } = {
    'free': 'Free',
    'budget': '$',
    'moderate': '$$',
    'expensive': '$$$',
    'luxury': '$$$$'
  }
  
  return ranges[priceRange] || 'Price varies'
}

function getUserPreferencesForContext(user: any, context: string): string {
  // Combine user interests with context-specific preferences
  const interests = user.interests || []
  const basePrefs = interests.join(', ') || 'varied interests'
  
  const contextPrefs: { [key: string]: string } = {
    'date': 'romantic atmosphere, quality dining, intimate settings',
    'friends': 'social venues, shared activities, good for groups',
    'family': 'family-friendly, activities for all ages, safe environment, educational opportunities',
    'solo': 'peaceful settings, personal enrichment, comfortable for solo visits',
    'business': 'professional atmosphere, quiet settings, good for meetings',
    'celebration': 'special atmosphere, fun activities, memorable experiences',
    'cultural': 'educational experiences, artistic venues, cultural enrichment',
    'casual': 'relaxed atmosphere, enjoyable experiences, good food'
  }
  
  const contextSpecific = contextPrefs[context] || 'enjoyable experiences'
  
  return `${basePrefs}; ${contextSpecific}`
}

function getTimeOfDay(date: Date): string {
  const hour = date.getHours()
  if (hour < 6) return 'Late Night'
  if (hour < 12) return 'Morning'
  if (hour < 17) return 'Afternoon'
  if (hour < 21) return 'Evening'
  return 'Night'
}

function getSeason(date: Date): string {
  const month = date.getMonth()
  if (month >= 2 && month <= 4) return 'Spring'
  if (month >= 5 && month <= 7) return 'Summer'
  if (month >= 8 && month <= 10) return 'Fall'
  return 'Winter'
}

function detectContextFromInput(input: string, fallbackContext: string): string {
  const inputLower = input.toLowerCase()
  
  // Family/kids context
  if (inputLower.includes('kid') || inputLower.includes('child') || inputLower.includes('family') || 
      inputLower.includes('children') || inputLower.includes('baby') || inputLower.includes('toddler')) {
    return 'family'
  }
  
  // Date/romantic context
  if (inputLower.includes('date') || inputLower.includes('romantic') || inputLower.includes('couple') || 
      inputLower.includes('anniversary') || inputLower.includes('valentine') || inputLower.includes('dinner')) {
    return 'date'
  }
  
  // Solo context
  if (inputLower.includes('solo') || inputLower.includes('alone') || inputLower.includes('me time') || 
      inputLower.includes('quiet') || inputLower.includes('peaceful')) {
    return 'solo'
  }
  
  // Group/friends context
  if (inputLower.includes('friend') || inputLower.includes('group') || inputLower.includes('party') || 
      inputLower.includes('social') || inputLower.includes('hangout') || inputLower.includes('meetup')) {
    return 'friends'
  }
  
  // Business context
  if (inputLower.includes('business') || inputLower.includes('meeting') || inputLower.includes('work') || 
      inputLower.includes('professional') || inputLower.includes('office')) {
    return 'business'
  }
  
  // Celebration context
  if (inputLower.includes('birthday') || inputLower.includes('celebration') || inputLower.includes('party') || 
      inputLower.includes('anniversary') || inputLower.includes('graduation')) {
    return 'celebration'
  }
  
  // Cultural context
  if (inputLower.includes('museum') || inputLower.includes('art') || inputLower.includes('culture') || 
      inputLower.includes('theater') || inputLower.includes('gallery') || inputLower.includes('history')) {
    return 'cultural'
  }
  
  // Default to casual if no specific context detected
  return fallbackContext || 'casual'
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