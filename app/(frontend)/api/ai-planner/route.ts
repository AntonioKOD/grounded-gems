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
    
    if (coordinates?.latitude && coordinates?.longitude) {
      try {
        const payload = await getPayload({ config })
        
        // Fetch nearby locations within 25 miles
        const { docs: allLocations } = await payload.find({
          collection: 'locations',
          limit: 50,
          depth: 1,
        })
        
        // Calculate distances and filter nearby locations
        const locationsWithDistance = allLocations
          .map((location: any) => {
            const locLat = location.coordinates?.latitude || location.latitude
            const locLng = location.coordinates?.longitude || location.longitude
            
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
          .filter((loc: any) => loc && loc.distance <= 25) // Within 25 miles
          .sort((a: any, b: any) => a.distance - b.distance)
          .slice(0, 20) // Top 20 closest locations
        
        nearbyLocations = locationsWithDistance
        
        // Create location context for AI
        if (nearbyLocations.length > 0) {
          const firstLocation = nearbyLocations[0]
          if (firstLocation.address?.city) {
            userLocation = firstLocation.address.city
          } else if (firstLocation.address && typeof firstLocation.address === 'string') {
            userLocation = firstLocation.address.split(',')[0] || 'your area'
          }
          
          // Format location data for AI context
          const locationDescriptions = nearbyLocations.slice(0, 10).map((loc: any) => {
            const address = loc.address?.city || loc.address?.street || 'local area'
            const categories = Array.isArray(loc.categories) 
              ? loc.categories.map((cat: any) => cat.name || cat).join(', ')
              : 'venue'
            const rating = loc.rating || loc.averageRating || 'unrated'
            
            return `${loc.name} (${categories}) - ${address} - Rating: ${rating}/5 - ${loc.distance.toFixed(1)} miles away`
          }).join('\n')
          
          locationContext = `\n\nNearby verified locations to consider:\n${locationDescriptions}`
        }
        
        console.log(`Found ${nearbyLocations.length} nearby locations for AI planning`)
      } catch (error) {
        console.error('Error fetching nearby locations:', error)
        // Continue with general planning if location fetch fails
      }
    }
    
    // Get user preferences (you can enhance this to pull from user profile)
    const userPreferences = user.interests?.join(', ') || 'varied interests, good atmosphere, quality experiences'
    
    // Get current time and weather context
    const now = new Date()
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' })
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    
    // Enhanced prompt with real location data
    const basePrompt = `You are Gem Journey, an expert local planner who creates amazing hangout plans using real, verified locations.

User Request: ${input}
Context: ${context}
User Preferences: ${userPreferences}
User Location: ${userLocation}
Day: ${dayOfWeek}
Current Time: ${time}
${locationContext}

Create a personalized hangout plan that:
1. Uses ONLY real locations from the nearby locations list when possible
2. Includes specific places, addresses, and timing
3. Considers travel time between locations
4. Matches the user's context (${context}) and preferences
5. Is realistic and actionable for today/tonight

If using nearby verified locations, reference them by their exact names and mention their distance.
If no suitable nearby locations exist for the request, suggest general location types but be clear they need to be researched locally.

Respond in the following JSON format:
{
  "title": "Catchy plan title",
  "summary": "Brief engaging description of the plan",
  "steps": ["Step 1 with specific location/time", "Step 2 with specific location/time", "etc"],
  "context": "${context}",
  "usedRealLocations": true/false,
  "locationIds": ["list of location IDs if real locations were used"]
}`

    // Call OpenAI API
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
            content: 'You are Gem Journey, a creative local planner who specializes in creating personalized hangout plans using real, verified locations. Always prioritize real locations when available and be specific about timing and logistics.' 
          },
          { role: 'user', content: basePrompt },
        ],
        max_tokens: 1000,
        temperature: 0.8, // Slightly less random for better consistency
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
      
    } catch (e) {
      console.error('Error parsing AI response:', e)
      // Fallback: return as plain text if parsing fails
      plan = { 
        title: 'Custom Hangout Plan', 
        summary: planRaw, 
        steps: planRaw.split('\n').filter(step => step.trim().length > 0), 
        context,
        usedRealLocations: false,
        coordinates,
        generatedAt: new Date().toISOString()
      }
    }
    
    return NextResponse.json({ 
      plan,
      nearbyLocationsFound: nearbyLocations.length,
      userLocation 
    })
    
  } catch (err: any) {
    console.error('AI Planner error:', err)
    return NextResponse.json({ 
      error: 'Failed to generate plan: ' + (err?.message || 'Unknown error') 
    }, { status: 500 })
  }
} 