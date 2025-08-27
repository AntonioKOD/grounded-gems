import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

// Function to generate username suggestions
function generateUsernameSuggestions(baseUsername: string): string[] {
  const suggestions: string[] = []
  const base = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '')
  
  if (base.length < 3) return suggestions
  
  // Add numbers
  for (let i = 1; i <= 5; i++) {
    const suggestion = `${base}${i}`
    suggestions.push(suggestion)
  }
  
  // Add common suffixes
  const suffixes = ['_', 'x', 'official', 'real', 'the']
  for (const suffix of suffixes) {
    const suggestion = `${base}_${suffix}`
    suggestions.push(suggestion)
  }
  
  // Add random numbers
  for (let i = 0; i < 3; i++) {
    const randomNum = Math.floor(Math.random() * 1000)
    const suggestion = `${base}${randomNum}`
    suggestions.push(suggestion)
  }
  
  return suggestions.slice(0, 8) // Limit to 8 suggestions
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')?.toLowerCase().trim()

    if (!username) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Username is required',
          code: 'MISSING_USERNAME'
        },
        { status: 400 }
      )
    }

    // Validate username format
    if (!/^[a-z0-9_-]+$/.test(username)) {
      return NextResponse.json({
        success: false,
        available: false,
        error: 'Username can only contain lowercase letters, numbers, hyphens, and underscores',
        errorType: 'INVALID_FORMAT',
        code: 'INVALID_USERNAME_FORMAT',
        suggestions: []
      })
    }

    if (username.length < 3) {
      return NextResponse.json({
        success: false,
        available: false,
        error: 'Username must be at least 3 characters long',
        errorType: 'TOO_SHORT',
        code: 'USERNAME_TOO_SHORT',
        suggestions: []
      })
    }

    if (username.length > 30) {
      return NextResponse.json({
        success: false,
        available: false,
        error: 'Username must be less than 30 characters',
        errorType: 'TOO_LONG',
        code: 'USERNAME_TOO_LONG',
        suggestions: []
      })
    }

    // Check for reserved usernames
    const reservedUsernames = [
      'admin', 'administrator', 'mod', 'moderator', 'support', 'help',
      'api', 'www', 'mail', 'email', 'test', 'demo', 'guest', 'user',
      'root', 'system', 'null', 'undefined', 'sacavia', 'staff',
      'official', 'verify', 'verified', 'bot', 'service'
    ]

    if (reservedUsernames.includes(username)) {
      return NextResponse.json({
        success: false,
        available: false,
        error: 'This username is reserved and cannot be used',
        errorType: 'RESERVED',
        code: 'RESERVED_USERNAME',
        suggestions: generateUsernameSuggestions(username)
      })
    }

    const payload = await getPayload({ config })

    // Check if username is already taken
    const existingUser = await payload.find({
      collection: 'users',
      where: {
        username: { equals: username }
      },
      limit: 1
    })

    const isAvailable = existingUser.docs.length === 0

    if (isAvailable) {
      return NextResponse.json({
        success: true,
        available: true,
        username: username,
        message: 'Username is available!',
        suggestions: []
      })
    } else {
      // Username is taken, generate suggestions
      const suggestions = generateUsernameSuggestions(username)
      
      return NextResponse.json({
        success: false,
        available: false,
        error: 'Username is already taken',
        errorType: 'TAKEN',
        code: 'USERNAME_TAKEN',
        suggestions: suggestions,
        message: 'Try one of these alternatives:'
      })
    }

  } catch (error) {
    console.error('Mobile username check error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Unable to check username availability',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}
