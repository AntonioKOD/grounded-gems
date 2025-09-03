import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: NextRequest) {
  try {
    const { email, fcmToken, deviceInfo } = await request.json()

    if (!email || !fcmToken) {
      return NextResponse.json(
        { success: false, error: 'Email and FCM token are required' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Find user by email
    const { docs: users } = await payload.find({
      collection: 'users',
      where: {
        email: { equals: email }
      },
      limit: 1
    })

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found with this email' },
        { status: 404 }
      )
    }

    const user = users[0]
    
    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, error: 'Invalid user data' },
        { status: 500 }
      )
    }

    // Check if device token already exists
    const existingToken = await payload.find({
      collection: 'deviceTokens',
      where: {
        deviceToken: { equals: fcmToken }
      },
      limit: 1
    })

    if (existingToken.docs.length > 0 && existingToken.docs[0]) {
      // Update existing token
      await payload.update({
        collection: 'deviceTokens',
        id: existingToken.docs[0].id,
        data: {
          user: user.id,
          email: email,
          isActive: true,
          lastSeen: new Date().toISOString(),
          deviceInfo: deviceInfo || {
            platform: 'ios',
            appVersion: '1.0.0'
          }
        }
      })

      console.log(`✅ [Register New Token] Updated existing FCM token for ${email}`)
    } else {
      // Create new device token
      await payload.create({
        collection: 'deviceTokens',
        data: {
          deviceToken: fcmToken,
          user: user.id,
          email: email,
          platform: 'ios',
          isActive: true,
          deviceInfo: deviceInfo || {
            platform: 'ios',
            appVersion: '1.0.0'
          }
        }
      })

      console.log(`✅ [Register New Token] Created new FCM token for ${email}`)
    }

    return NextResponse.json({
      success: true,
      message: `FCM token registered successfully for ${email}`,
      userId: user.id,
      email: email
    })

  } catch (error) {
    console.error('❌ [Register New Token] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to register FCM token',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
