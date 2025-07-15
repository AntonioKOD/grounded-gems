import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import crypto from 'crypto'

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

    // First, check if user exists with this email
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

    const user = existingUser.docs[0]

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Update user with reset token without triggering username validation
    await payload.update({
      collection: 'users',
      id: user?.id as string,
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpiration: resetTokenExpiry,
      },
      // Skip validation to avoid username field issues
      overrideAccess: true,
    })

    // Generate reset URL
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

    // Send email using PayloadCMS email service
    try {
      await payload.sendEmail({
        to: email,
        from: process.env.FROM_EMAIL || 'noreply@sacavia.com',
        subject: 'Password Reset Request - Sacavia',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Password Reset</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Reset your Sacavia account password</p>
            </div>
            
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                Hi there,
              </p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                We received a request to reset your password for your Sacavia account. Click the button below to create a new password:
              </p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${resetUrl}" style="background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(255,107,107,0.3);">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              
              <p style="color: #4ECDC4; font-size: 14px; word-break: break-all; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
                ${resetUrl}
              </p>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                This link will expire in 1 hour for security reasons.
              </p>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 0;">
                If you didn't request this password reset, please ignore this email. Your password will not be changed.
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p style="margin: 0;">© 2024 Sacavia. All rights reserved.</p>
            </div>
          </div>
        `,
      })
    } catch (emailError) {
      console.error('Email sending failed:', emailError)
      // Still return success to not reveal if user exists
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully',
    })

  } catch (error: any) {
    console.error('Forgot password error:', error)
    
    // Don't reveal specific errors for security
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    })
  }
} 