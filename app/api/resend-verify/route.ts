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
    if (user._verified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 200 }
      )
    }

    // Resend verification email using Payload's built-in method
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.sacavia.com' 
      : 'http://localhost:3000'
    
    await payload.sendEmail({
      to: email,
      subject: 'Verify Your Sacavia Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #FF6B6B; margin-bottom: 20px;">Verify Your Sacavia Account</h2>
          <p>Hi ${user.name},</p>
          <p>Please verify your email address by clicking the link below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/verify?token=${user._verificationToken}" 
               style="background-color: #FF6B6B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Verify Email
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this URL into your browser:</p>
          <p style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;">${baseUrl}/verify?token=${user._verificationToken}</p>
          
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

    return NextResponse.json(
      { message: 'Verification email sent successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    )
  }
} 