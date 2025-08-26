import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { sendPushNotification } from '@/lib/push-notifications'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { message = 'Test notification from Sacavia!' } = body

    // Send test notification to the current user
    const success = await sendPushNotification(String(user.id), {
      title: '🧪 Test Notification',
      body: message,
      icon: '/icon-192.png',
      data: {
        type: 'test',
        timestamp: Date.now()
      },
      tag: 'test-notification'
    })

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test notification sent successfully' 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'No active push subscriptions found for this user' 
      })
    }

  } catch (error) {
    console.error('Error sending test notification:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send test notification' },
      { status: 500 }
    )
  }
}
