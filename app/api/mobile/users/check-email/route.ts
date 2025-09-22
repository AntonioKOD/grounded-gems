import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')?.toLowerCase().trim()

    if (!email) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email is required',
          code: 'MISSING_EMAIL'
        },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        available: false,
        error: 'Please enter a valid email address',
        errorType: 'INVALID_FORMAT',
        code: 'INVALID_EMAIL_FORMAT'
      })
    }

    // Check for common invalid email patterns
    const invalidPatterns = [
      /^test@/i,
      /^admin@/i,
      /^noreply@/i,
      /^no-reply@/i,
      /@test\./i,
      /@example\./i,
      /@localhost/i
    ]

    if (invalidPatterns.some(pattern => pattern.test(email))) {
      return NextResponse.json({
        success: false,
        available: false,
        error: 'This email address cannot be used for registration',
        errorType: 'INVALID_DOMAIN',
        code: 'INVALID_EMAIL_DOMAIN'
      })
    }

    const payload = await getPayload({ config })

    // Check if email is already registered
    const existingUser = await payload.find({
      collection: 'users',
      where: {
        email: { equals: email }
      },
      limit: 1
    })

    const isAvailable = existingUser.docs.length === 0

    if (isAvailable) {
      return NextResponse.json({
        success: true,
        available: true,
        email: email,
        message: 'Email is available!'
      })
    } else {
      return NextResponse.json({
        success: false,
        available: false,
        error: 'This email is already registered',
        errorType: 'ALREADY_EXISTS',
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email already exists'
      })
    }

  } catch (error) {
    console.error('Mobile email check error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Unable to check email availability',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}




















