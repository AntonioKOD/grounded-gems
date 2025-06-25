import { NextRequest, NextResponse } from 'next/server'
import { getServerSideUser } from '@/lib/auth-server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const runtime = 'nodejs'  // Changed from edge to support payload

export async function POST(req: NextRequest) {
  const user = await getServerSideUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const { input, context, coordinates } = await req.json()
    
    // Get real location data if coordinates are provided
    let nearbyLocations: any[] = []
    let locationContext = ''
    let userLocation = 'your area'
    let usedRealLocations = false
    let referencedLocationIds: string[] = []
    
    if (coordinates?.latitude && coordinates?.longitude) {
      try {
        const payload = await getPayload({ config })
        
        // Fetch user data for preferences
        const userData = await payload.findByID({
          collection: 'users',
          id: user.id,
          depth: 1
        })
        
        // Fetch nearby locations within 20 miles with better filtering
        const { docs: allLocations } = await payload.find({
          collection: 'locations',
          where: {
            and: [
              { status: { equals: 'published' } },
              { 'coordinates.latitude': { exists: true } },
              { 'coordinates.longitude': { exists: true } }
            ]
          },
          limit: 100,
          depth: 2, // Get more details including categories and contact info
        })
        
        // Calculate distances and filter nearby locations
        const locationsWithDistance = allLocations
          .map((location: any) => {
            const locLat = location.coordinates?.latitude
            const locLng = location.coordinates?.longitude
            
            if (!locLat || !locLng) return null
            
            // Haversine distance calculation
            const R = 3959 // Earth's radius in miles
            const dLat = (locLat - coordinates.latitude) * Math.PI / 180
            const dLon = (locLng - coordinates.longitude) * Math.PI / 180
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coordinates.latitude * Math.PI / 180) * Math.cos(locLat * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
            const distance = R * c
            
            return {
              ...location,
              distance
            }
          })
          .filter((loc: any) => loc && loc.distance <= 20) // Within 20 miles
          .sort((a: any, b: any) => a.distance - b.distance)
        
        nearbyLocations = locationsWithDistance
        
        // Create more detailed location context for AI
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
          
          // Select best locations for AI planning based on type and preferences
          const selectedLocations = selectBestLocationsForContext(nearbyLocations, context, userData?.interests || [])
          referencedLocationIds = selectedLocations.map(loc => loc.id)
          
          // Format location data for AI context with rich details
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
            
            return `${loc.name}${verified} (${categories}) - ${address} - ${loc.distance.toFixed(1)} miles away
   Rating: ${rating} | Price: ${priceRange} | Hours: ${hours}${contact}${website}${tips}`
          }).join('\n\n')
          
          locationContext = `\n\nNEARBY VERIFIED LOCATIONS TO INCLUDE IN YOUR PLAN:\n${locationDescriptions}`
        }
        
        console.log(`Found ${nearbyLocations.length} nearby locations for AI planning`)
      } catch (error) {
        console.error('Error fetching nearby locations:', error)
        // Continue with general planning if location fetch fails
      }
    }
    
    // Get enhanced user preferences
    const userPreferences = getUserPreferencesForContext(user, context)
    
    // Get current time and context
    const now = new Date()
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' })
    const timeOfDay = getTimeOfDay(now)
    const season = getSeason(now)
    
    // Enhanced prompt with real location data and better context
    let planningInstructions = `
PLANNING INSTRUCTIONS:
1. CREATE A SPECIFIC, ACTIONABLE PLAN.
2. IF VERIFIED LOCATIONS ARE PROVIDED, YOU MUST PRIORITIZE AND INTEGRATE THEM. Clearly label these as "(Verified Sacavia Location)".
3. If creating a step for a type of place not in the verified list, clearly label it as "(Find a local spot for this)".
4. CONSIDER timing, travel between locations, and realistic scheduling.
5. INCLUDE specific addresses (if known from verified locations), estimated costs (general terms like $, $$, $$$), and timing for each step.
6. REFERENCE verified locations by their EXACT NAMES as listed.
7. If combining multiple verified locations, ensure they're logically sequenced.
8. Consider current time of day and day of week for business hours if suggesting types of places.
9. Add insider tips and specific recommendations when available, especially for verified locations.
`
    let stepCountGuidance = "Aim for 4-6 detailed steps."

    if (nearbyLocations.length > 0) {
      planningInstructions += `
10. You have ${nearbyLocations.length} real verified locations nearby. Your plan MUST use at least ${Math.min(nearbyLocations.length, 2)} of these. Make the plan feel like a local insider's recommendation, focusing on these verified spots.`
      if (nearbyLocations.length <= 2) {
        stepCountGuidance = "Aim for 2-3 detailed steps, focusing on the provided verified locations."
      } else if (nearbyLocations.length <= 4) {
        stepCountGuidance = "Aim for 3-5 detailed steps, integrating several of the provided verified locations."
      }
      planningInstructions += `\n11. For each step involving a verified location, state its name exactly as provided and append "(Verified Sacavia Location)".`
    } else {
      planningInstructions += `
10. No verified locations found nearby. Create a general plan with location types and suggestions (e.g., "a cozy cafe", "a lively park"). Clearly label these as "(Find a local spot for this)".`
      stepCountGuidance = "Aim for 3-5 general steps, suggesting types of places."
    }
    planningInstructions += `\n12. ${stepCountGuidance}`


    const basePrompt = `You are Gem Journey, an expert local experience planner who creates amazing, actionable hangout plans using real, verified locations.

USER REQUEST: "${input}"
HANGOUT TYPE: ${context}
USER LOCATION: ${userLocation}
DAY & TIME: ${dayOfWeek}, ${timeOfDay}
SEASON: ${season}
USER PREFERENCES: ${userPreferences}
${locationContext}

${planningInstructions}

Respond in the following JSON format:
{
  "title": "Engaging, specific plan title (include general area if no specific locations used, or a key location if used)",
  "summary": "Brief, exciting description (mention real places if used, otherwise general theme)",
  "steps": [
    "Step 1: [Time (e.g., 7:00 PM)] - [Specific action] at [Specific location name or type of place] [Label: (Verified Sacavia Location) or (Find a local spot for this)] - [Brief description/tip, address if verified, cost estimate like $, $$, $$$]"
  ],
  "context": "${context}",
  "usedRealLocations": ${usedRealLocations},
  "locationIds": ${JSON.stringify(referencedLocationIds)}
}`

    // Call OpenAI API with enhanced model settings
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPEN_AI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4', // Using GPT-4 for better planning
        messages: [
          { 
            role: 'system', 
            content: `You are Gem Journey, a creative local experience planner who specializes in creating personalized hangout plans using real, verified locations. You always prioritize real locations when available, provide specific timing and logistics, and make recommendations feel like they come from a local insider. Focus on creating memorable, actionable experiences.` 
          },
          { role: 'user', content: basePrompt },
        ],
        max_tokens: 1200,
        temperature: 0.7, // Balanced creativity and consistency
      })
    })

    if (!openaiRes.ok) {
      const error = await openaiRes.text()
      console.error('OpenAI API error:', error)
      
      // Provide a more specific error message based on the status code
      let errorMessage = 'AI planning service temporarily unavailable'
      if (openaiRes.status === 401) {
        errorMessage = 'AI service authentication failed'
      } else if (openaiRes.status === 429) {
        errorMessage = 'AI service is currently busy. Please try again in a moment.'
      } else if (openaiRes.status >= 500) {
        errorMessage = 'AI service is experiencing issues. Please try again later.'
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
    
    const data = await openaiRes.json()
    let planRaw = data.choices?.[0]?.message?.content || ''
    let plan
    
    try {
      // Try to parse JSON from the AI response
      const jsonStart = planRaw.indexOf('{')
      const jsonEnd = planRaw.lastIndexOf('}') + 1
      if (jsonStart === -1 || jsonEnd === -1 || jsonStart > jsonEnd) {
        throw new Error("Valid JSON structure not found in AI response.")
      }
      
      const jsonString = planRaw.slice(jsonStart, jsonEnd)
      plan = JSON.parse(jsonString)
      
      // Validate required fields
      if (!plan.title || !plan.summary || !Array.isArray(plan.steps)) {
        throw new Error("AI response missing required fields")
      }
      
      // Ensure steps are properly formatted
      if (plan.steps.length === 0) {
        throw new Error("AI response has no steps")
      }
      
      // Add metadata about the planning session
      plan.coordinates = coordinates
      plan.nearbyLocationsCount = nearbyLocations.length
      plan.generatedAt = new Date().toISOString()
      // Ensure these are consistent with what AI might have overridden if it didn't follow instructions
      plan.usedRealLocations = usedRealLocations 
      plan.locationIds = referencedLocationIds
      plan.userLocation = userLocation
      
    } catch (e) {
      console.error('Error parsing AI response:', e)
      console.log('Raw AI response:', planRaw)
      
      // Enhanced fallback parsing with better error handling
      let extractedTitle = 'Custom Hangout Plan'
      let extractedSummary = 'Here is a plan based on your request.'
      let stepsArray: string[] = []
      
      try {
        // Try to extract title
        const titleMatch = planRaw.match(/title["']?\s*:\s*["']([^"']+)["']/i)
        if (titleMatch && titleMatch[1]) {
          extractedTitle = titleMatch[1]
        }
        
        // Try to extract summary
        const summaryMatch = planRaw.match(/summary["']?\s*:\s*["']([^"']+)["']/i)
        if (summaryMatch && summaryMatch[1]) {
          extractedSummary = summaryMatch[1]
        }
        
        // Try to extract steps using multiple patterns
        const stepRegex = /step\s*\d+\s*[:\-]\s*(.*)/gi
        let match
        while ((match = stepRegex.exec(planRaw)) !== null) {
          const step = match[1].trim()
          if (step.length > 5) { // Only add meaningful steps
            stepsArray.push(step)
          }
        }
        
        // Fallback step extraction if regex fails
        if (stepsArray.length === 0) {
          const lines = planRaw.split('\n')
          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.match(/^(\d+\.|-|Step\s*\d+:)/i) && trimmed.length > 10) {
              const step = trimmed.replace(/^(\d+\.|-|Step\s*\d+:)\s*/i, '')
              if (step.length > 5) {
                stepsArray.push(step)
              }
            }
          }
        }
        
        // If still no steps, create a generic one
        if (stepsArray.length === 0) {
          stepsArray.push("The AI generated a plan, but there was an issue formatting the steps. Please try rephrasing your request for better results.")
        }
        
      } catch (fallbackError) {
        console.error('Error in fallback parsing:', fallbackError)
        stepsArray = ["We encountered an issue processing the AI response. Please try again with a different request."]
      }

      plan = { 
        title: extractedTitle, 
        summary: extractedSummary, 
        steps: stepsArray,
        context,
        usedRealLocations: false, // Assume false if parsing failed
        locationIds: [],
        coordinates,
        generatedAt: new Date().toISOString(),
        userLocation,
        nearbyLocationsCount: nearbyLocations.length,
        parseError: true, // Indicate that this is a fallback
      }
    }
    
    return NextResponse.json({ 
      plan,
      nearbyLocationsFound: nearbyLocations.length,
      userLocation,
      usedRealLocations
    })
    
  } catch (err: any) {
    console.error('AI Planner error:', err)
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Failed to generate plan'
    let statusCode = 500
    
    if (err.message?.includes('fetch')) {
      errorMessage = 'Unable to connect to AI service. Please check your internet connection and try again.'
    } else if (err.message?.includes('JSON')) {
      errorMessage = 'Error processing AI response. Please try again.'
    } else if (err.message?.includes('Unauthorized')) {
      errorMessage = 'Authentication error. Please try again later.'
      statusCode = 401
    } else if (err.message?.includes('rate limit') || err.message?.includes('too many requests')) {
      errorMessage = 'Too many requests. Please wait a moment and try again.'
      statusCode = 429
    } else {
      errorMessage = `Failed to generate plan: ${err?.message || 'Unknown error'}`
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      plan: { // Provide a minimal fallback plan structure on catastrophic error
        title: "Plan Generation Error",
        summary: "We encountered an issue while trying to generate your plan. Please try again shortly.",
        steps: ["Try rephrasing your request or check back later."],
        context: "error",
        usedRealLocations: false,
        locationIds: [],
        generatedAt: new Date().toISOString(),
        userLocation: "N/A",
        nearbyLocationsCount: 0,
        error: true
      }
    }, { status: statusCode })
  }
}

// Helper functions
function selectBestLocationsForContext(locations: any[], context: string, userInterests: string[] = []) {
  // Filter and rank locations based on context and user interests
  const contextKeywords = getContextKeywords(context)
  const interestKeywords = userInterests.flatMap(interest => interest.toLowerCase().split(' '))
  
  const scoredLocations = locations.map(loc => {
    let score = 0
    
    // Score based on context relevance
    const locText = `${loc.name} ${loc.description || ''} ${formatLocationCategories(loc.categories)}`.toLowerCase()
    contextKeywords.forEach(keyword => {
      if (locText.includes(keyword)) score += 3
    })
    
    // Score based on user interests
    interestKeywords.forEach(interest => {
      if (locText.includes(interest)) score += 2
    })
    
    // Bonus for verified and highly rated locations
    if (loc.isVerified) score += 2
    if (loc.averageRating >= 4.0) score += 1
    if (loc.isFeatured) score += 1
    
    // Penalty for distance (closer is better)
    score -= loc.distance * 0.1
    
    return { ...loc, score }
  })
  
  // Return top scored locations, ensuring variety
  return scoredLocations
    .sort((a, b) => b.score - a.score)
    .slice(0, 8) // Top 8 for AI to choose from
}

function getContextKeywords(context: string): string[] {
  const contextMap: { [key: string]: string[] } = {
    'date': ['romantic', 'dinner', 'restaurant', 'cafe', 'wine', 'intimate', 'cozy', 'view'],
    'group': ['bar', 'restaurant', 'activity', 'entertainment', 'game', 'music', 'social'],
    'family': ['family', 'kid', 'child', 'park', 'museum', 'outdoor', 'activity', 'fun'],
    'solo': ['cafe', 'book', 'quiet', 'park', 'museum', 'walk', 'peaceful', 'solo'],
    'friend_group': ['bar', 'game', 'activity', 'social', 'fun', 'entertainment', 'food']
  }
  
  return contextMap[context] || ['entertainment', 'food', 'activity']
}

function formatLocationAddress(address: any): string {
  if (typeof address === 'string') return address
  if (!address) return 'Address not available'
  
  const parts = [
    address.street,
    address.city,
    address.state,
    address.zip
  ].filter(Boolean)
  
  return parts.join(', ') || 'Address not available'
}

function formatLocationCategories(categories: any[]): string {
  if (!categories || !Array.isArray(categories)) return 'General'
  
  return categories
    .map(cat => typeof cat === 'string' ? cat : cat?.name || 'Category')
    .join(', ') || 'General'
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
    'group': 'social venues, shared activities, good for groups',
    'family': 'family-friendly, activities for all ages, safe environment',
    'solo': 'peaceful settings, personal enrichment, comfortable for solo visits',
    'friend_group': 'fun activities, social dining, entertainment'
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