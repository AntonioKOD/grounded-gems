import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map<string, { locationTips: Map<string, number>, dailyTotal: number, lastReset: number }>()

// Rate limit configuration
const RATE_LIMITS = {
  TIPS_PER_LOCATION_PER_DAY: 1,
  TOTAL_TIPS_PER_DAY: 3,
  RESET_HOURS: 24
}

function getRateLimitKey(userId: string): string {
  return `user:${userId}`
}

function isRateLimitExceeded(userId: string, locationId: string): { exceeded: boolean; reason?: string } {
  const now = Date.now()
  const key = getRateLimitKey(userId)
  const userLimits = rateLimitStore.get(key)
  
  // Reset daily limits if 24 hours have passed
  if (!userLimits || (now - userLimits.lastReset) > (RATE_LIMITS.RESET_HOURS * 60 * 60 * 1000)) {
    rateLimitStore.set(key, {
      locationTips: new Map(),
      dailyTotal: 0,
      lastReset: now
    })
    return { exceeded: false }
  }
  
  // Check total daily limit
  if (userLimits.dailyTotal >= RATE_LIMITS.TOTAL_TIPS_PER_DAY) {
    return { exceeded: true, reason: 'Daily tip limit exceeded (3 tips per day)' }
  }
  
  // Check per-location limit
  const locationTipCount = userLimits.locationTips.get(locationId) || 0
  if (locationTipCount >= RATE_LIMITS.TIPS_PER_LOCATION_PER_DAY) {
    return { exceeded: true, reason: 'Tip limit exceeded for this location (1 tip per day)' }
  }
  
  return { exceeded: false }
}

function updateRateLimit(userId: string, locationId: string): void {
  const key = getRateLimitKey(userId)
  const userLimits = rateLimitStore.get(key) || {
    locationTips: new Map(),
    dailyTotal: 0,
    lastReset: Date.now()
  }
  
  // Increment counters
  const currentLocationCount = userLimits.locationTips.get(locationId) || 0
  userLimits.locationTips.set(locationId, currentLocationCount + 1)
  userLimits.dailyTotal += 1
  
  rateLimitStore.set(key, userLimits)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayload({ config })
    
    // Get authenticated user
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { text } = body
    
    // Validate required fields
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      )
    }

    // Validate text length (140-280 characters)
    const trimmedText = text.trim()
    if (trimmedText.length < 140) {
      return NextResponse.json(
        { error: 'Tip must be at least 140 characters long' },
        { status: 400 }
      )
    }
    
    if (trimmedText.length > 280) {
      return NextResponse.json(
        { error: 'Tip must be no more than 280 characters long' },
        { status: 400 }
      )
    }

    // Get the location
    const location = await payload.findByID({
      collection: 'locations',
      id: params.id,
    })
    
    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check if location has too many tips (>= 10)
    const currentTips = location.insiderTips || []
    if (currentTips.length >= 10) {
      return NextResponse.json(
        { error: 'This location has reached the maximum number of tips (10)' },
        { status: 409 }
      )
    }

    // Check for duplicate tips (case-insensitive)
    const normalizedNewText = trimmedText.toLowerCase()
    const isDuplicate = currentTips.some((tip: any) => {
      if (typeof tip === 'object' && tip.tip) {
        return tip.tip.toLowerCase() === normalizedNewText
      }
      return false
    })

    if (isDuplicate) {
      return NextResponse.json(
        { error: 'A similar tip already exists for this location' },
        { status: 409 }
      )
    }

    // Check rate limits
    const rateLimitCheck = isRateLimitExceeded(String(user.id), params.id)
    if (rateLimitCheck.exceeded) {
      return NextResponse.json(
        { error: rateLimitCheck.reason },
        { status: 429 }
      )
    }

    // Create the new tip
    const newTip = {
      text: trimmedText,
      author: user.id,
      source: 'user',
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    // Add the tip to the location
    const updatedLocation = await payload.update({
      collection: 'locations',
      id: params.id,
      data: {
        insiderTips: [...currentTips, newTip]
      },
    })

    // Update rate limit counters
    updateRateLimit(String(user.id), params.id)

    // Return the new tip
    return NextResponse.json({
      success: true,
      tip: newTip,
      totalTips: updatedLocation.insiderTips.length
    })

  } catch (error) {
    console.error('Error adding tip:', error)
    
    return NextResponse.json(
      { error: 'Failed to add tip' },
      { status: 500 }
    )
  }
}


