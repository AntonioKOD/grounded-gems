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
    const basePrompt = `You are Gem Journey, an expert local experience planner who creates amazing, actionable hangout plans using real, verified locations.

USER REQUEST: "${input}"
HANGOUT TYPE: ${context}
USER LOCATION: ${userLocation}
DAY & TIME: ${dayOfWeek}, ${timeOfDay}
SEASON: ${season}
USER PREFERENCES: ${userPreferences}
${locationContext}

PLANNING INSTRUCTIONS:
1. CREATE A SPECIFIC, ACTIONABLE PLAN using the nearby verified locations listed above
2. PRIORITIZE locations that match the hangout type (${context}) and user request
3. CONSIDER timing, travel between locations, and realistic scheduling
4. INCLUDE specific addresses, estimated costs, and timing for each step
5. REFERENCE locations by their EXACT NAMES as listed above
6. If combining multiple locations, ensure they're logically sequenced by proximity
7. Consider current time of day and day of week for business hours
8. Add insider tips and specific recommendations when available

${nearbyLocations.length > 0 ? 
  `Since you have ${nearbyLocations.length} real verified locations nearby, create a plan that uses at least 2-3 of these actual places. Make it feel like a local insider's recommendation.` 
  : 
  `No verified locations found nearby. Create a general plan with location types and suggestions, but be clear these need to be researched locally.`}

Respond in the following JSON format:
{
  "title": "Engaging, specific plan title that includes location/area",
  "summary": "Brief, exciting description that mentions real places if used",
  "steps": [
    "Step 1: [Time] - [Specific action] at [Specific location with address] - [Brief description/tip]",
    "Step 2: [Time] - [Next action] at [Next location] - [Description]",
    "Continue with 4-6 detailed steps..."
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
      return NextResponse.json({ error: 'AI planning service temporarily unavailable' }, { status: 500 })
    }
    
    const data = await openaiRes.json()
    let planRaw = data.choices?.[0]?.message?.content || ''
    let plan
    
    try {
      // Try to parse JSON from the AI response
      const jsonStart = planRaw.indexOf('{')
      const jsonEnd = planRaw.lastIndexOf('}') + 1
      plan = JSON.parse(planRaw.slice(jsonStart, jsonEnd))
      
      // Add metadata about the planning session
      plan.coordinates = coordinates
      plan.nearbyLocationsCount = nearbyLocations.length
      plan.generatedAt = new Date().toISOString()
      plan.usedRealLocations = usedRealLocations
      plan.locationIds = referencedLocationIds
      
    } catch (e) {
      console.error('Error parsing AI response:', e)
      console.log('Raw AI response:', planRaw)
      // Fallback: return as plain text if parsing fails
      plan = { 
        title: 'Custom Hangout Plan', 
        summary: planRaw, 
        steps: planRaw.split('\n').filter(step => step.trim().length > 0).map(step => step.trim()), 
        context,
        usedRealLocations: false,
        locationIds: [],
        coordinates,
        generatedAt: new Date().toISOString()
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
    return NextResponse.json({ 
      error: 'Failed to generate plan: ' + (err?.message || 'Unknown error') 
    }, { status: 500 })
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