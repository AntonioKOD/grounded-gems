import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getFirebaseMessaging } from '@/lib/firebase-admin'

// Define types for better type safety
interface TopicItem {
  topic: string
  subscribedAt: string
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication middleware here
    // - Verify user has permission to manage topic subscriptions
    // - Rate limiting for unsubscription operations
    // - Validate user owns the device token or has admin rights
    
    const { deviceToken, topics, userId, all = false } = await request.json()

    // Validate required fields
    if (!deviceToken) {
      return NextResponse.json(
        { error: 'Device token is required' },
        { status: 400 }
      )
    }

    // If not unsubscribing from all topics, topics array is required
    if (!all && (!topics || !Array.isArray(topics) || topics.length === 0)) {
      return NextResponse.json(
        { error: 'Topics array is required when not unsubscribing from all topics' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Check if device token exists
    const existingToken = await payload.find({
      collection: 'deviceTokens',
      where: {
        deviceToken: { equals: deviceToken }
      },
      limit: 1
    })

    if (existingToken.docs.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Device token not found'
      }, { status: 404 })
    }

    const tokenDoc = existingToken.docs[0]

    // Ensure tokenDoc exists before proceeding
    if (!tokenDoc) {
      return NextResponse.json({
        success: false,
        message: 'Failed to retrieve token document'
      }, { status: 500 })
    }

    // Check if token is active
    if (!tokenDoc.isActive) {
      return NextResponse.json({
        success: false,
        message: 'Device token is not active'
      }, { status: 400 })
    }

    // Check user permission if userId is provided
    if (userId && tokenDoc.user && tokenDoc.user !== userId) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized to manage this device token'
      }, { status: 403 })
    }

    const existingTopics: TopicItem[] = tokenDoc.topics || []
    
    if (existingTopics.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Device token is not subscribed to any topics',
        deviceToken,
        unsubscribedTopics: [],
        remainingTopics: 0
      })
    }

    let topicsToUnsubscribe: string[]
    let remainingTopics: TopicItem[]

    if (all) {
      // Unsubscribe from all topics
      topicsToUnsubscribe = existingTopics.map((t: TopicItem) => t.topic)
      remainingTopics = []
    } else {
      // Unsubscribe from specific topics
      topicsToUnsubscribe = topics.filter((topic: string) => 
        existingTopics.some((et: TopicItem) => et.topic === topic)
      )
      remainingTopics = existingTopics.filter((t: TopicItem) => 
        !topics.includes(t.topic)
      )
    }

    if (topicsToUnsubscribe.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No topics to unsubscribe from',
        deviceToken,
        unsubscribedTopics: [],
        remainingTopics: existingTopics.length
      })
    }

    try {
      const messaging = getFirebaseMessaging()
      
      // Unsubscribe from topics via FCM (one by one since FCM expects single topic)
      for (const topic of topicsToUnsubscribe) {
        await messaging.unsubscribeFromTopic([deviceToken], topic)
      }
      
      console.log(`Successfully unsubscribed device ${deviceToken} from topics: ${topicsToUnsubscribe.join(', ')}`)
    } catch (fcmError) {
      console.error('FCM topic unsubscription error:', fcmError)
      return NextResponse.json({
        success: false,
        message: 'Failed to unsubscribe from topics via FCM',
        error: fcmError instanceof Error ? fcmError.message : 'Unknown FCM error'
      }, { status: 500 })
    }

    // Update the device token document
    await payload.update({
      collection: 'deviceTokens',
      id: tokenDoc.id,
      data: {
        topics: remainingTopics,
        lastUsed: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully unsubscribed from ${topicsToUnsubscribe.length} topic(s)`,
      deviceToken,
      unsubscribedTopics: topicsToUnsubscribe,
      remainingTopics: remainingTopics.length,
      totalTopicsBefore: existingTopics.length,
      totalTopicsAfter: remainingTopics.length
    })

  } catch (error) {
    console.error('Error unsubscribing from topics:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to unsubscribe from topics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // TODO: Add authentication middleware here
    // - Verify user has permission to manage topic subscriptions
    // - Rate limiting for unsubscription operations
    
    const { deviceToken, userId } = await request.json()

    if (!deviceToken) {
      return NextResponse.json(
        { error: 'Device token is required' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Check if device token exists
    const existingToken = await payload.find({
      collection: 'deviceTokens',
      where: {
        deviceToken: { equals: deviceToken }
      },
      limit: 1
    })

    if (existingToken.docs.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Device token not found'
      }, { status: 404 })
    }

    const tokenDoc = existingToken.docs[0]

    // Ensure tokenDoc exists before proceeding
    if (!tokenDoc) {
      return NextResponse.json({
        success: false,
        message: 'Failed to retrieve token document'
      }, { status: 500 })
    }

    // Check user permission if userId is provided
    if (userId && tokenDoc.user && tokenDoc.user !== userId) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized to manage this device token'
      }, { status: 403 })
    }

    const existingTopics: TopicItem[] = tokenDoc.topics || []
    
    if (existingTopics.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Device token is not subscribed to any topics',
        deviceToken,
        unsubscribedTopics: [],
        remainingTopics: 0
      })
    }

    try {
      const messaging = getFirebaseMessaging()
      
      // Unsubscribe from all topics via FCM (one by one since FCM expects single topic)
      const allTopicNames = existingTopics.map((t: TopicItem) => t.topic)
      for (const topic of allTopicNames) {
        await messaging.unsubscribeFromTopic([deviceToken], topic)
      }
      
      console.log(`Successfully unsubscribed device ${deviceToken} from all topics: ${allTopicNames.join(', ')}`)
    } catch (fcmError) {
      console.error('FCM topic unsubscription error:', fcmError)
      return NextResponse.json({
        success: false,
        message: 'Failed to unsubscribe from topics via FCM',
        error: fcmError instanceof Error ? fcmError.message : 'Unknown FCM error'
      }, { status: 500 })
    }

    // Update the device token document to remove all topics
    await payload.update({
      collection: 'deviceTokens',
      id: tokenDoc.id,
      data: {
        topics: [],
        lastUsed: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully unsubscribed from all ${existingTopics.length} topic(s)`,
      deviceToken,
      unsubscribedTopics: existingTopics.map((t: TopicItem) => t.topic),
      remainingTopics: 0,
      totalTopicsBefore: existingTopics.length,
      totalTopicsAfter: 0
    })

  } catch (error) {
    console.error('Error unsubscribing from all topics:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to unsubscribe from all topics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication middleware here
    // - Verify user has permission to view topic subscriptions
    
    const { searchParams } = new URL(request.url)
    const deviceToken = searchParams.get('deviceToken')
    const userId = searchParams.get('userId')

    if (!deviceToken) {
      return NextResponse.json(
        { error: 'Device token is required' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Check if device token exists
    const existingToken = await payload.find({
      collection: 'deviceTokens',
      where: {
        deviceToken: { equals: deviceToken }
      },
      limit: 1
    })

    if (existingToken.docs.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Device token not found'
      }, { status: 404 })
    }

    const tokenDoc = existingToken.docs[0]

    // Ensure tokenDoc exists before proceeding
    if (!tokenDoc) {
      return NextResponse.json({
        success: false,
        message: 'Failed to retrieve token document'
      }, { status: 500 })
    }

    // Check user permission if userId is provided
    if (userId && tokenDoc.user && tokenDoc.user !== userId) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized to view this device token'
      }, { status: 403 })
    }

    const topics: TopicItem[] = tokenDoc.topics || []

    return NextResponse.json({
      success: true,
      deviceToken,
      topics: topics.map((t: TopicItem) => ({
        topic: t.topic,
        subscribedAt: t.subscribedAt
      })),
      totalTopics: topics.length,
      isActive: tokenDoc.isActive,
      platform: tokenDoc.platform,
      user: tokenDoc.user
    })

  } catch (error) {
    console.error('Error getting topic subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to get topic subscriptions' },
      { status: 500 }
    )
  }
}
