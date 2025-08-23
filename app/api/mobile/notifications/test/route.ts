import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { sendPushNotification } from '@/lib/push-notifications'

// POST /api/mobile/notifications/test - Send a test push notification
export async function POST(request: NextRequest) {
  try {
    // Check for Bearer token in Authorization header
    const authorization = request.headers.get('authorization')
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const requestBody = await request.json()
    const { title = 'Test Notification', body = 'This is a test notification from Sacavia!' } = requestBody

    // Send test notification to the current user
    const success = await sendPushNotification(String(user.id), {
      title,
      body,
      data: {
        type: 'test_notification',
        timestamp: new Date().toISOString()
      },
      badge: 1
    })

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test notification sent successfully',
        data: {
          userId: user.id,
          title,
          body
        }
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to send test notification',
        details: 'No active device tokens found for this user'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error sending test notification:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send test notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
