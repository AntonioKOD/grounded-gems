import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getFirebaseMessaging } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const { deviceToken, topic } = await request.json()

    if (!deviceToken || !topic) {
      return NextResponse.json(
        { error: 'Device token and topic are required' },
        { status: 400 }
      )
    }

    const messaging = getFirebaseMessaging()

    try {
      // Subscribe device to topic
      await messaging.subscribeToTopic([deviceToken], topic)
      
      return NextResponse.json({
        success: true,
        message: `Device subscribed to topic: ${topic}`
      })
    } catch (fcmError) {
      console.error('FCM topic subscription error:', fcmError)
      return NextResponse.json(
        { error: 'Failed to subscribe to topic' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error subscribing to FCM topic:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe to topic' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { deviceToken, topic } = await request.json()

    if (!deviceToken || !topic) {
      return NextResponse.json(
        { error: 'Device token and topic are required' },
        { status: 400 }
      )
    }

    const messaging = getFirebaseMessaging()

    try {
      // Unsubscribe device from topic
      await messaging.unsubscribeFromTopic([deviceToken], topic)
      
      return NextResponse.json({
        success: true,
        message: `Device unsubscribed from topic: ${topic}`
      })
    } catch (fcmError) {
      console.error('FCM topic unsubscription error:', fcmError)
      return NextResponse.json(
        { error: 'Failed to unsubscribe from topic' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error unsubscribing from FCM topic:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe from topic' },
      { status: 500 }
    )
  }
}

// Get topics for a device token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceToken = searchParams.get('deviceToken')

    if (!deviceToken) {
      return NextResponse.json(
        { error: 'Device token is required' },
        { status: 400 }
      )
    }

    // Note: FCM doesn't provide a direct API to get topics for a device
    // This would need to be tracked in your database
    const payload = await getPayload({ config })
    
    // Get device token document to see if it has topic information
    const deviceTokenDoc = await payload.find({
      collection: 'deviceTokens',
      where: {
        deviceToken: { equals: deviceToken }
      }
    })

    if (deviceTokenDoc.docs.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Device token not found',
        topics: []
      })
    }

    // Return topics if they're stored in the device token document
    const deviceDoc = deviceTokenDoc.docs[0]
    if (!deviceDoc) {
      return NextResponse.json({
        success: false,
        message: 'Device token document not found',
        topics: []
      })
    }
    
    const topics = deviceDoc.topics || []
    
    return NextResponse.json({
      success: true,
      topics
    })
  } catch (error) {
    console.error('Error getting FCM topics:', error)
    return NextResponse.json(
      { error: 'Failed to get topics' },
      { status: 500 }
    )
  }
}
