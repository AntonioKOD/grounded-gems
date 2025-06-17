import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')?.toLowerCase().trim()

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    // Validate username format
    if (!/^[a-z0-9_-]+$/.test(username)) {
      return NextResponse.json({
        available: false,
        error: 'Username can only contain lowercase letters, numbers, hyphens, and underscores'
      })
    }

    if (username.length < 3) {
      return NextResponse.json({
        available: false,
        error: 'Username must be at least 3 characters long'
      })
    }

    if (username.length > 30) {
      return NextResponse.json({
        available: false,
        error: 'Username must be less than 30 characters'
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
        available: false,
        error: 'This username is reserved and cannot be used'
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

    return NextResponse.json({
      available: isAvailable,
      username: username,
      ...(isAvailable 
        ? { message: 'Username is available!' }
        : { error: 'Username is already taken' }
      )
    })

  } catch (error) {
    console.error('Username check error:', error)
    return NextResponse.json(
      { error: 'Unable to check username availability' },
      { status: 500 }
    )
  }
} 