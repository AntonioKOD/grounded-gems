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
    // - Rate limiting for subscription operations
    // - Validate user owns the device token or has admin rights
    
    const { deviceToken, topics, userId } = await request.json()

    // Validate required fields
    if (!deviceToken) {
      return NextResponse.json(
        { error: 'Device token is required' },
        { status: 400 }
      )
    }

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json(
        { error: 'Topics array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Validate topic names (basic validation)
    const invalidTopics = topics.filter(topic => 
      !topic || typeof topic !== 'string' || topic.length < 1 || topic.length > 100
    )
    
    if (invalidTopics.length > 0) {
      return NextResponse.json(
        { error: 'Invalid topic names found', invalidTopics },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Check if device token exists and is active
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

    try {
      const messaging = getFirebaseMessaging()
      
      // Subscribe to topics via FCM (one by one since FCM expects single topic)
      for (const topic of topics) {
        await messaging.subscribeToTopic([deviceToken], topic)
      }
      
      console.log(`Successfully subscribed device ${deviceToken} to topics: ${topics.join(', ')}`)
    } catch (fcmError) {
      console.error('FCM topic subscription error:', fcmError)
      return NextResponse.json({
        success: false,
        message: 'Failed to subscribe to topics via FCM',
        error: fcmError instanceof Error ? fcmError.message : 'Unknown FCM error'
      }, { status: 500 })
    }

    // Update local database with new topics
    const now = new Date().toISOString()
    const existingTopics: TopicItem[] = tokenDoc.topics || []
    const newTopics: TopicItem[] = topics.map(topic => ({
      topic,
      subscribedAt: now
    }))

    // Merge existing and new topics, avoiding duplicates
    const topicMap = new Map<string, TopicItem>()
    existingTopics.forEach((t: TopicItem) => topicMap.set(t.topic, t))
    newTopics.forEach((t: TopicItem) => topicMap.set(t.topic, t))

    const updatedTopics = Array.from(topicMap.values())

    // Update the device token document
    await payload.update({
      collection: 'deviceTokens',
      id: tokenDoc.id,
      data: {
        topics: updatedTopics,
        lastUsed: now
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully subscribed to ${topics.length} topic(s)`,
      deviceToken,
      subscribedTopics: topics,
      totalTopics: updatedTopics.length,
      newTopics: topics.filter(topic => 
        !existingTopics.some(et => et.topic === topic)
      )
    })

  } catch (error) {
    console.error('Error subscribing to topics:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to subscribe to topics',
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
    // - Rate limiting for subscription operations
    
    const { deviceToken, topics, userId } = await request.json()

    // Validate required fields
    if (!deviceToken) {
      return NextResponse.json(
        { error: 'Device token is required' },
        { status: 400 }
      )
    }

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json(
        { error: 'Topics array is required and must not be empty' },
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

    try {
      const messaging = getFirebaseMessaging()
      
      // Unsubscribe from topics via FCM (one by one since FCM expects single topic)
      for (const topic of topics) {
        await messaging.unsubscribeFromTopic([deviceToken], topic)
      }
      
      console.log(`Successfully unsubscribed device ${deviceToken} from topics: ${topics.join(', ')}`)
    } catch (fcmError) {
      console.error('FCM topic unsubscription error:', fcmError)
      return NextResponse.json({
        success: false,
        message: 'Failed to unsubscribe from topics via FCM',
        error: fcmError instanceof Error ? fcmError.message : 'Unknown FCM error'
      }, { status: 500 })
    }

    // Update local database by removing specified topics
    const existingTopics: TopicItem[] = tokenDoc.topics || []
    const updatedTopics = existingTopics.filter(t => !topics.includes(t.topic))

    // Update the device token document
    await payload.update({
      collection: 'deviceTokens',
      id: tokenDoc.id,
      data: {
        topics: updatedTopics,
        lastUsed: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully unsubscribed from ${topics.length} topic(s)`,
      deviceToken,
      unsubscribedTopics: topics,
      remainingTopics: updatedTopics.length,
      removedTopics: topics.filter(topic => 
        existingTopics.some(et => et.topic === topic)
      )
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

export async function PUT(request: NextRequest) {
  try {
    // TODO: Add authentication middleware here
    // - Verify user has permission to manage topic subscriptions
    // - Rate limiting for subscription operations
    
    const { deviceToken, topics, userId, replace = false } = await request.json()

    // Validate required fields
    if (!deviceToken) {
      return NextResponse.json(
        { error: 'Device token is required' },
        { status: 400 }
      )
    }

    if (!topics || !Array.isArray(topics)) {
      return NextResponse.json(
        { error: 'Topics array is required' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Check if device token exists and is active
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

    const now = new Date().toISOString()
    const existingTopics: TopicItem[] = tokenDoc.topics || []

    if (replace) {
      // Replace all topics (unsubscribe from old, subscribe to new)
      const oldTopics = existingTopics.map(t => t.topic).filter(t => !topics.includes(t))
      const newTopics = topics.filter(t => !existingTopics.some(et => et.topic === t))

      try {
        const messaging = getFirebaseMessaging()
        
        // Unsubscribe from old topics
        if (oldTopics.length > 0) {
          for (const topic of oldTopics) {
            await messaging.unsubscribeFromTopic([deviceToken], topic)
          }
          console.log(`Unsubscribed from old topics: ${oldTopics.join(', ')}`)
        }
        
        // Subscribe to new topics
        if (newTopics.length > 0) {
          for (const topic of newTopics) {
            await messaging.subscribeToTopic([deviceToken], topic)
          }
          console.log(`Subscribed to new topics: ${newTopics.join(', ')}`)
        }
      } catch (fcmError) {
        console.error('FCM topic replacement error:', fcmError)
        return NextResponse.json({
          success: false,
          message: 'Failed to replace topics via FCM',
          error: fcmError instanceof Error ? fcmError.message : 'Unknown FCM error'
        }, { status: 500 })
      }

      // Update database with new topic list
      const updatedTopics: TopicItem[] = topics.map(topic => ({
        topic,
        subscribedAt: now
      }))

      await payload.update({
        collection: 'deviceTokens',
        id: tokenDoc.id,
        data: {
          topics: updatedTopics,
          lastUsed: now
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Successfully replaced all topics',
        deviceToken,
        newTopics: topics,
        removedTopics: oldTopics,
        totalTopics: topics.length
      })
    } else {
      // Merge topics (add new ones, keep existing)
      const newTopics = topics.filter(topic => 
        !existingTopics.some(et => et.topic === topic)
      )

      if (newTopics.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'All topics already subscribed',
          deviceToken,
          existingTopics: existingTopics.map(t => t.topic),
          totalTopics: existingTopics.length
        })
      }

      try {
        const messaging = getFirebaseMessaging()
        for (const topic of newTopics) {
          await messaging.subscribeToTopic([deviceToken], topic)
        }
        console.log(`Subscribed to new topics: ${newTopics.join(', ')}`)
      } catch (fcmError) {
        console.error('FCM topic merge error:', fcmError)
        return NextResponse.json({
          success: false,
          message: 'Failed to merge topics via FCM',
          error: fcmError instanceof Error ? fcmError.message : 'Unknown FCM error'
        }, { status: 500 })
      }

      // Update database by adding new topics
      const updatedTopics: TopicItem[] = [
        ...existingTopics,
        ...newTopics.map(topic => ({
          topic,
          subscribedAt: now
        }))
      ]

      await payload.update({
        collection: 'deviceTokens',
        id: tokenDoc.id,
        data: {
          topics: updatedTopics,
          lastUsed: now
        }
      })

      return NextResponse.json({
        success: true,
        message: `Successfully merged ${newTopics.length} new topic(s)`,
        deviceToken,
        newTopics,
        existingTopics: existingTopics.map(t => t.topic),
        totalTopics: updatedTopics.length
      })
    }

  } catch (error) {
    console.error('Error managing topics:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to manage topics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
