import { NextRequest, NextResponse } from 'next/server'
import { firebaseSender } from '@/lib/firebase-admin'

// POST /api/test-firebase-notification - Send test Firebase notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fcmToken } = body

    if (!fcmToken) {
      return NextResponse.json({
        success: false,
        error: 'FCM token is required'
      }, { status: 400 })
    }

    console.log('🔥 Testing Firebase notification with token:', fcmToken.substring(0, 20) + '...')

    const result = await firebaseSender.sendNotification(fcmToken, {
      title: '🎉 Firebase Test Success!',
      body: 'Your Firebase notifications are now working!',
      data: {
        type: 'test',
        timestamp: Date.now(),
        message: 'Firebase Admin SDK is properly configured'
      }
    })

    if (result) {
      return NextResponse.json({
        success: true,
        message: 'Firebase notification sent successfully',
        data: {
          fcmToken: fcmToken.substring(0, 20) + '...',
          timestamp: new Date().toISOString()
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to send Firebase notification'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Firebase notification test error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Firebase notification test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
