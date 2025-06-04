import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()
    
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Use PayloadCMS's built-in resetPassword method
    const result = await payload.resetPassword({
      collection: 'users',
      data: {
        token,
        password,
      },
      req: request,
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    })

  } catch (error) {
    console.error('Reset password error:', error)
    
    // Handle specific PayloadCMS errors
    if (error.message?.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new password reset.' },
        { status: 400 }
      )
    }
    
    if (error.message?.includes('User not found')) {
      return NextResponse.json(
        { error: 'Invalid reset token. Please request a new password reset.' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    )
  }
} 