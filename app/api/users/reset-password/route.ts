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

    // Find user with the reset token
    const users = await payload.find({
      collection: 'users',
      where: {
        resetPasswordToken: {
          equals: token,
        },
        resetPasswordExpiration: {
          greater_than: new Date(),
        },
      },
      limit: 1,
    })

    if (users.docs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new password reset.' },
        { status: 400 }
      )
    }

    const user = users.docs[0]

    // Update user password and clear reset token
    const updatedUser = await payload.update({
      collection: 'users',
      id: user?.id as string,
      data: {
        password,
        resetPasswordToken: null,
        resetPasswordExpiration: null,
      },
      overrideAccess: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
      },
    })

  } catch (error) {
    console.error('Reset password error:', error)
    // Handle specific PayloadCMS errors
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new password reset.' },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('User not found')) {
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