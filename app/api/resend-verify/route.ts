import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Basic rate limiting - check if this email has been requested recently
    const rateLimitKey = `resend_verify_${email.toLowerCase()}`
    const rateLimitData = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: email.toLowerCase(),
        },
      },
      limit: 1,
    })

    if (rateLimitData.docs.length > 0) {
      const user = rateLimitData.docs[0]
      const lastResendTime = user?.lastResendVerificationTime
      
      if (lastResendTime) {
        const timeSinceLastResend = Date.now() - new Date(lastResendTime).getTime()
        const minInterval = 60 * 1000 // 1 minute minimum between resends
        
        if (timeSinceLastResend < minInterval) {
          const remainingTime = Math.ceil((minInterval - timeSinceLastResend) / 1000)
          return NextResponse.json(
            { 
              error: `Please wait ${remainingTime} seconds before requesting another verification email.`,
              success: false,
              rateLimited: true
            },
            { status: 429 }
          )
        }
      }
    }

    // Find user by email
    const users = await payload.find({
      collection: 'users',
      where: {
        email: {
          equals: email,
        },
      },
    })

    if (users.docs.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const user = users.docs[0]

    // Check if user is already verified
    if (user?._verified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 200 }
      )
    }

    // Resend verification email using Payload's built-in method
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.sacavia.com' 
      : 'http://localhost:3000'
    
    // Generate a new verification token if one doesn't exist or has expired
    let verificationToken = user?._verificationToken
    
    // Check if token exists and hasn't expired
    const tokenExpired = user?._verificationTokenExpiry && new Date(user._verificationTokenExpiry) < new Date()
    
    console.log('Resend verification debug:', {
      email: user?.email,
      hasToken: !!verificationToken,
      tokenExpired,
      expiryDate: user?._verificationTokenExpiry
    })
    
    if (!verificationToken || tokenExpired) {
      // Generate a new verification token
      const crypto = require('crypto')
      verificationToken = crypto.randomBytes(32).toString('hex')
      
      // Update the user with the new verification token
      try {
        await payload.update({
          collection: 'users',
          id: user?.id as string,
          data: {
            _verificationToken: verificationToken,
            _verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
        })
        console.log('Generated new verification token for user:', user?.email, 'Token:', verificationToken.substring(0, 10) + '...')
      } catch (updateError) {
        console.error('Failed to generate new verification token:', updateError)
        
        // Try to use the existing token if available, even if expired
        if (user?._verificationToken) {
          console.log('Falling back to existing token for user:', user?.email)
          verificationToken = user?._verificationToken
        } else {
          return NextResponse.json(
            { 
              error: 'Failed to generate verification token. Please try again in a few minutes.',
              success: false,
              code: 'TOKEN_GENERATION_FAILED'
            },
            { status: 500 }
          )
        }
      }
    }
    
    // Final check to ensure we have a valid token
    if (!verificationToken) {
      console.error('No verification token available for user:', user?.email)
      return NextResponse.json(
        { 
          error: 'Unable to generate verification token. Please contact support.',
          success: false,
          code: 'NO_TOKEN_AVAILABLE'
        },
        { status: 500 }
      )
    }
    
    console.log('Sending verification email to:', user?.email, 'with token:', verificationToken.substring(0, 10) + '...')
    
    await payload.sendEmail({
      to: email,
      subject: 'Verify Your Sacavia Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #FF6B6B; margin-bottom: 20px;">Verify Your Sacavia Account</h2>
          <p>Hi ${user?.name || 'there'},</p>
          <p>Please verify your email address by clicking the link below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/verify?token=${verificationToken}" 
               style="background-color: #FF6B6B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Verify Email
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this URL into your browser:</p>
          <p style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;">${baseUrl}/verify?token=${verificationToken}</p>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #856404;">📧 Email Delivery Notice:</p>
            <p style="margin: 10px 0 0 0; color: #856404;">
              If you don't see this email in your inbox, please check your <strong>spam or junk folder</strong>. 
              To ensure you receive future emails from Sacavia, add <strong>noreply@sacavia.com</strong> to your contacts.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
          <p style="color: #666; font-size: 14px;">If you didn't create an account with Sacavia, please ignore this email.</p>
        </div>
      `,
    })

    // Update user record to track the last resend time
    try {
      await payload.update({
        collection: 'users',
        id: user?.id as string,
        data: {
          lastResendVerificationTime: new Date(),
        },
      })
    } catch (updateError) {
      console.warn('Failed to update user resend verification time:', updateError)
      // Don't fail the resend if this update fails
    }

    return NextResponse.json(
      { 
        message: 'Verification email sent successfully',
        success: true,
        email: email
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to resend verification email. Please try again in a few minutes.',
        success: false
      },
      { status: 500 }
    )
  }
} 