import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Query parameters validation
const notificationsQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).default('20'),
  unreadOnly: z.string().transform((val) => val === 'true').default('false'),
  type: z.enum(['all', 'follow', 'like', 'comment', 'mention', 'event', 'location', 'system']).default('all'),
})

interface MobileNotificationsResponse {
  success: boolean
  message: string
  data?: {
    notifications: Array<{
      id: string
      type: string
      title: string
      message: string
      isRead: boolean
      createdAt: string
      metadata?: {
        userId?: string
        postId?: string
        locationId?: string
        eventId?: string
        followerId?: string
        followerName?: string
        followerAvatar?: string
        [key: string]: any
      }
      actionUrl?: string
    }>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
    unreadCount: number
  }
  error?: string
  code?: string
}

export async function GET(request: NextRequest): Promise<NextResponse<MobileNotificationsResponse>> {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'No authentication token provided',
          code: 'NO_TOKEN'
        },
        { status: 401 }
      )
    }

    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid token',
          error: 'Authentication token is invalid or expired',
          code: 'INVALID_TOKEN'
        },
        { status: 401 }
      )
    }

    // Validate query parameters
    const queryValidation = notificationsQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid query parameters',
          error: queryValidation.error.errors[0].message,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    const { page, limit, unreadOnly, type } = queryValidation.data

    // Build query conditions
    let whereClause: any = {
      recipient: { equals: user.id }
    }

    // Filter by read status
    if (unreadOnly) {
      whereClause.isRead = { equals: false }
    }

    // Filter by notification type
    if (type !== 'all') {
      whereClause.type = { equals: type }
    }

    // Fetch notifications
    const notificationsResult = await payload.find({
      collection: 'notifications',
      where: whereClause,
      sort: { createdAt: 'desc' },
      page,
      limit,
      depth: 1,
    })

    // Get total unread count for user
    const unreadResult = await payload.find({
      collection: 'notifications',
      where: {
        recipient: { equals: user.id },
        isRead: { equals: false }
      },
      limit: 0,
    })

    // Format notifications for mobile consumption
    const formattedNotifications = notificationsResult.docs.map((notification: any) => {
      // Determine action URL based on notification type
      let actionUrl: string | undefined

      switch (notification.type) {
        case 'follow':
          if (notification.metadata?.followerId) {
            actionUrl = `/profile/${notification.metadata.followerId}`
          }
          break
        case 'like':
        case 'comment':
          if (notification.metadata?.postId) {
            actionUrl = `/post/${notification.metadata.postId}`
          }
          break
        case 'event':
          if (notification.metadata?.eventId) {
            actionUrl = `/events/${notification.metadata.eventId}`
          }
          break
        case 'location':
          if (notification.metadata?.locationId) {
            actionUrl = `/locations/${notification.metadata.locationId}`
          }
          break
        default:
          actionUrl = undefined
      }

      return {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: notification.isRead || false,
        createdAt: notification.createdAt,
        metadata: notification.metadata || {},
        actionUrl,
      }
    })

    // Calculate pagination
    const totalPages = Math.ceil(notificationsResult.totalDocs / limit)

    const response: MobileNotificationsResponse = {
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications: formattedNotifications,
        pagination: {
          page,
          limit,
          total: notificationsResult.totalDocs,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        unreadCount: unreadResult.totalDocs,
      },
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=60', // 1 minute cache for notifications
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('Mobile notifications error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Notifications service unavailable',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}

// PATCH endpoint for bulk operations (mark all as read)
export async function PATCH(request: NextRequest): Promise<NextResponse<{ success: boolean; message: string; data?: any; error?: string; code?: string }>> {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()

    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'No authentication token provided',
          code: 'NO_TOKEN'
        },
        { status: 401 }
      )
    }

    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid token',
          error: 'Authentication token is invalid or expired',
          code: 'INVALID_TOKEN'
        },
        { status: 401 }
      )
    }

    const { action, notificationIds } = body

    if (action === 'markAllAsRead') {
      // Mark all user's notifications as read
      const unreadNotifications = await payload.find({
        collection: 'notifications',
        where: {
          recipient: { equals: user.id },
          isRead: { equals: false }
        },
        limit: 1000, // Reasonable limit for bulk operation
      })

      // Update all unread notifications
      const updatePromises = unreadNotifications.docs.map((notification: any) =>
        payload.update({
          collection: 'notifications',
          id: notification.id,
          data: { isRead: true },
        })
      )

      await Promise.all(updatePromises)

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
        data: {
          markedCount: unreadNotifications.docs.length,
        },
      })

    } else if (action === 'markAsRead' && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      const updatePromises = notificationIds.map((id: string) =>
        payload.update({
          collection: 'notifications',
          id,
          data: { isRead: true },
          where: {
            recipient: { equals: user.id } // Ensure user owns the notification
          }
        }).catch(error => {
          console.warn(`Failed to mark notification ${id} as read:`, error)
          return null
        })
      )

      const results = await Promise.all(updatePromises)
      const successCount = results.filter(result => result !== null).length

      return NextResponse.json({
        success: true,
        message: `${successCount} notifications marked as read`,
        data: {
          markedCount: successCount,
          requestedCount: notificationIds.length,
        },
      })

    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid action',
          error: 'Action must be "markAllAsRead" or "markAsRead" with notificationIds',
          code: 'INVALID_ACTION'
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Mobile notifications update error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Notifications update service unavailable',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 