import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    // Check for device tokens
    const deviceTokens = await payload.find({
      collection: 'deviceTokens',
      where: {
        and: [
          { user: { equals: String(user.id) } },
          { isActive: { equals: true } }
        ]
      }
    })

    // Check for push subscriptions
    const pushSubscriptions = await payload.find({
      collection: 'push-subscriptions',
      where: {
        and: [
          { user: { equals: String(user.id) } },
          { isActive: { equals: true } }
        ]
      }
    })

    const hasDeviceTokens = deviceTokens.docs.length > 0
    const hasPushSubscriptions = pushSubscriptions.docs.length > 0
    const isRegistered = hasDeviceTokens || hasPushSubscriptions

    return NextResponse.json({
      success: true,
      isRegistered,
      deviceTokens: {
        count: deviceTokens.docs.length,
        active: hasDeviceTokens
      },
      pushSubscriptions: {
        count: pushSubscriptions.docs.length,
        active: hasPushSubscriptions
      },
      details: {
        deviceTokens: deviceTokens.docs.map(token => ({
          id: token.id,
          platform: token.platform,
          deviceInfo: token.deviceInfo,
          createdAt: token.createdAt,
          lastSeen: token.lastSeen
        })),
        pushSubscriptions: pushSubscriptions.docs.map(sub => ({
          id: sub.id,
          endpoint: sub.endpoint,
          userAgent: sub.userAgent,
          createdAt: sub.createdAt,
          lastSeen: sub.lastSeen
        }))
      }
    })

  } catch (error) {
    console.error('Error checking device registration:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check registration status' },
      { status: 500 }
    )
  }
}

