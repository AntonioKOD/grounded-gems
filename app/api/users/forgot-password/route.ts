import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()
    
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists first
    const existingUser = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: email,
        },
      },
      limit: 1,
    })

    if (existingUser.docs.length === 0) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      })
    }

    // Use PayloadCMS's built-in forgotPassword method
    await payload.forgotPassword({
      collection: 'users',
      data: {
        email,
      },
      req: request,
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully',
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    
    // Check if it's a known PayloadCMS error
    if (error.message?.includes('User not found')) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      })
    }
    
    return NextResponse.json(
      { error: 'Failed to send password reset email. Please try again.' },
      { status: 500 }
    )
  }
} 