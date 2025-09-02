import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Define types for better type safety
interface TopicItem {
  topic: string
  subscribedAt: string
}

interface DeviceInfo {
  model?: string
  os?: string
  appVersion?: string
  buildNumber?: string
  deviceId?: string
}

export async function POST(request: NextRequest) {
  try {
    const { deviceToken, userId, platform, deviceInfo, topics } = await request.json()

    // Validate required fields
    if (!deviceToken) {
      return NextResponse.json(
        { error: 'Device token is required' },
        { status: 400 }
      )
    }

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform is required' },
        { status: 400 }
      )
    }

    // Validate platform value
    const validPlatforms = ['ios', 'android', 'web', 'unknown']
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be one of: ios, android, web, unknown' },
        { status: 400 }
      )
    }

    // Validate device token length
    if (deviceToken.length < 10) {
      return NextResponse.json(
        { error: 'Device token must be at least 10 characters long' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Check if device token already exists
    const existingToken = await payload.find({
      collection: 'deviceTokens',
      where: {
        deviceToken: { equals: deviceToken }
      },
      limit: 1
    })

    let result
    const now = new Date().toISOString()

    if (existingToken.docs.length > 0) {
      // Update existing token
      const tokenDoc = existingToken.docs[0]
      
      // Ensure tokenDoc exists before proceeding
      if (!tokenDoc) {
        return NextResponse.json(
          { error: 'Failed to retrieve existing token document' },
          { status: 500 }
        )
      }
      
      // Prepare update data
      const updateData: any = {
        platform,
        isActive: true,
        lastUsed: now,
        deviceInfo: deviceInfo || tokenDoc.deviceInfo || {},
      }

      // Only update user if provided and different
      if (userId && userId !== tokenDoc.user) {
        updateData.user = userId
      }

      // Update topics if provided
      if (topics && Array.isArray(topics)) {
        const existingTopics: TopicItem[] = tokenDoc.topics || []
        const newTopics: TopicItem[] = topics.map((topic: string) => ({
          topic,
          subscribedAt: now
        }))
        
        // Merge existing and new topics, avoiding duplicates
        const topicMap = new Map<string, TopicItem>()
        existingTopics.forEach((t: TopicItem) => topicMap.set(t.topic, t))
        newTopics.forEach((t: TopicItem) => topicMap.set(t.topic, t))
        
        updateData.topics = Array.from(topicMap.values())
      }

      result = await payload.update({
        collection: 'deviceTokens',
        id: tokenDoc.id,
        data: updateData
      })

      console.log(`Updated existing device token: ${deviceToken} for user: ${userId || 'anonymous'}`)
    } else {
      // Create new device token
      const createData: any = {
        deviceToken,
        fcmToken: deviceToken, // For compatibility
        platform,
        isActive: true,
        lastUsed: now,
        deviceInfo: deviceInfo || {},
      }

      // Add user if provided
      if (userId) {
        createData.user = userId
      }

      // Add topics if provided
      if (topics && Array.isArray(topics)) {
        createData.topics = topics.map((topic: string) => ({
          topic,
          subscribedAt: now
        }))
      }

      result = await payload.create({
        collection: 'deviceTokens',
        data: createData
      })

      console.log(`Created new device token: ${deviceToken} for user: ${userId || 'anonymous'}`)
    }

    // Ensure result exists before proceeding
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to create or update device token' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: existingToken.docs.length > 0 ? 'Device token updated successfully' : 'Device token registered successfully',
      tokenId: result.id,
      deviceToken: result.deviceToken,
      platform: result.platform,
      isActive: result.isActive,
      user: result.user,
      topics: result.topics || []
    })

  } catch (error) {
    console.error('Error registering FCM device token:', error)
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        return NextResponse.json(
          { error: 'Device token already exists' },
          { status: 409 }
        )
      }
      
      if (error.message.includes('validation failed')) {
        return NextResponse.json(
          { error: 'Validation failed. Please check your input data.' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to register device token' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { deviceToken, userId } = await request.json()

    if (!deviceToken) {
      return NextResponse.json(
        { error: 'Device token is required' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Find the device token
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
      })
    }

    const tokenDoc = existingToken.docs[0]
    
    // Ensure tokenDoc exists before proceeding
    if (!tokenDoc) {
      return NextResponse.json(
        { error: 'Failed to retrieve token document' },
        { status: 500 }
      )
    }

    // Check if user has permission to delete this token
    if (userId && tokenDoc.user && tokenDoc.user !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this device token' },
        { status: 403 }
      )
    }

    // Soft delete by deactivating the token
    await payload.update({
      collection: 'deviceTokens',
      id: tokenDoc.id,
      data: {
        isActive: false,
        deactivatedAt: new Date().toISOString(),
        deactivationReason: 'manual'
      }
    })

    console.log(`Deactivated device token: ${deviceToken}`)

    return NextResponse.json({
      success: true,
      message: 'Device token deactivated successfully'
    })

  } catch (error) {
    console.error('Error deactivating FCM device token:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate device token' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
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

    // Find the device token
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
      })
    }

    const tokenDoc = existingToken.docs[0]
    
    // Ensure tokenDoc exists before proceeding
    if (!tokenDoc) {
      return NextResponse.json(
        { error: 'Failed to retrieve token document' },
        { status: 500 }
      )
    }

    // Check if user has permission to view this token
    if (userId && tokenDoc.user && tokenDoc.user !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to view this device token' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      deviceToken: tokenDoc.deviceToken,
      platform: tokenDoc.platform,
      isActive: tokenDoc.isActive,
      user: tokenDoc.user,
      topics: tokenDoc.topics || [],
      deviceInfo: tokenDoc.deviceInfo || {},
      lastUsed: tokenDoc.lastUsed,
      createdAt: tokenDoc.createdAt,
      updatedAt: tokenDoc.updatedAt
    })

  } catch (error) {
    console.error('Error retrieving device token:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve device token' },
      { status: 500 }
    )
  }
}
