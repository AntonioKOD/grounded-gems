import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { sendPushNotification } from '@/lib/push-notifications'

// POST /api/mobile/notifications/test - Send a test push notification
export async function POST(request: NextRequest) {
  try {
    console.log('🔔 [Test API] Test notification request received')
    
    // Check for Bearer token in Authorization header
    const authorization = request.headers.get('authorization')
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      console.log('🔔 [Test API] Authentication required')
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      console.log('🔔 [Test API] User not found')
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    console.log(`🔔 [Test API] User authenticated: ${user.id}`)

    const requestBody = await request.json()
    const { title = 'Test Notification', body = 'This is a test notification from Sacavia!' } = requestBody

    console.log(`🔔 [Test API] Test notification data:`, { title, body, userId: user.id })

    // Check if user has device tokens
    const deviceTokens = await payload.find({
      collection: 'deviceTokens',
      where: {
        and: [
          { user: { equals: String(user.id) } },
          { isActive: { equals: true } }
        ]
      }
    })

    console.log(`🔔 [Test API] Found ${deviceTokens.docs.length} device tokens for user ${user.id}`)

    if (deviceTokens.docs.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No device tokens found',
        details: 'User has no registered device tokens. Make sure the device is properly registered.',
        userId: user.id
      }, { status: 400 })
    }

    // Send test notification to the current user
    const success = await sendPushNotification(String(user.id), {
      title,
      body,
      data: {
        type: 'test_notification',
        timestamp: new Date().toISOString()
      },
      badge: "1"
    })

    if (success) {
      console.log(`🔔 [Test API] Test notification sent successfully to user ${user.id}`)
      return NextResponse.json({ 
        success: true, 
        message: 'Test notification sent successfully',
        data: {
          userId: user.id,
          title,
          body,
          deviceTokensCount: deviceTokens.docs.length,
          environment: process.env.NODE_ENV,
          hasApnConfig: !!(process.env.APN_KEY_PATH && process.env.APN_KEY_ID && process.env.APN_TEAM_ID)
        }
      })
    } else {
      console.log(`🔔 [Test API] Failed to send test notification to user ${user.id}`)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to send test notification',
        details: 'The notification was processed but may not have been delivered. Check APN configuration.',
        data: {
          userId: user.id,
          deviceTokensCount: deviceTokens.docs.length,
          environment: process.env.NODE_ENV,
          hasApnConfig: !!(process.env.APN_KEY_PATH && process.env.APN_KEY_ID && process.env.APN_TEAM_ID)
        }
      }, { status: 400 })
    }
  } catch (error) {
    console.error('🔔 [Test API] Error sending test notification:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send test notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
