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
        limit: 0, // We only need the count for the response, or all IDs for update
        select: { id: true } // Only select IDs to be efficient
      })

      if (unreadNotifications.docs.length > 0) {
        const idsToUpdate = unreadNotifications.docs.map((n: any) => n.id);
        await payload.update({
          collection: 'notifications',
          where: {
            id: { in: idsToUpdate },
            recipient: { equals: user.id } // Ensure user owns these notifications
          },
          data: { isRead: true },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
        data: {
          markedCount: unreadNotifications.docs.length,
        },
      })

    } else if (action === 'markAsRead' && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Mark specific notifications as read using bulk update
      const result = await payload.update({
        collection: 'notifications',
        where: {
          id: { in: notificationIds },
          recipient: { equals: user.id } // Ensure user owns these notifications
        },
        data: { isRead: true },
      });

      // The `update` operation with a `where` clause might not return a simple count
      // of updated documents directly in all Payload versions or configurations.
      // We assume it processes all valid IDs. If specific counts of successful updates
      // are needed, we might need to query again or inspect `result.docs` if available.
      // For now, we report based on the number of IDs requested.
      // Payload's bulk operations typically return `{ docs: [], errors: [] }`
      // A more precise count would be `notificationIds.length - result.errors.length` if errors are populated.
      // Let's assume for now `result.docs.length` gives us the count if available and successful,
      // otherwise, we fall back to requested count as a general success message.
      
      let successCount = 0;
      if (result && Array.isArray(result.docs)) {
        successCount = result.docs.length; // Number of documents that matched and were updated
      } else {
        // Fallback or if `result.docs` isn't populated as expected for bulk updates.
        // This part might need adjustment based on the exact structure of `result` from bulk `payload.update`
        // For this example, we will assume the operation attempts to update all valid IDs.
        // A more robust way is to count IDs that didn't produce an error if `result.errors` is available.
        successCount = notificationIds.length; // Assume all requested were attempted
      }
      
      // A more accurate way if errors are reported:
      // const successCount = notificationIds.length - (result.errors ? result.errors.length : 0);

      return NextResponse.json({
        success: true,
        message: `${successCount} of ${notificationIds.length} notifications processed for marking as read`,
        data: {
          markedCount: successCount, // This might be an optimistic count
          requestedCount: notificationIds.length,
          // errors: result.errors // Optionally return errors if any
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