import { NextRequest, NextResponse } from 'next/server'
import { 
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getRecentNotifications
} from '@/app/actions'
import { getServerSideUser } from '@/lib/auth-server'

// GET /api/v1/mobile/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const user = await getServerSideUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // all, recent, unread
    const limit = parseInt(searchParams.get('limit') || '20')
    const markAsRead = searchParams.get('markAsRead') === 'true'

    console.log(`Mobile API: Getting ${type} notifications for user ${user.id}`)

    let notifications: any[] = []
    let unreadCount = 0

    switch (type) {
      case 'recent':
        notifications = await getRecentNotifications(user.id, limit)
        break
        
      case 'unread':
        // Get all notifications and filter unread
        const allNotifications = await getNotifications(user.id, limit * 2) // Get more to ensure we have enough unread
        notifications = allNotifications.filter(notif => !notif.read).slice(0, limit)
        break
        
      default: // 'all'
        notifications = await getNotifications(user.id, limit)
    }

    // Get unread count
    unreadCount = await getUnreadNotificationCount(user.id)

    // Mark notifications as read if requested
    if (markAsRead && notifications.length > 0) {
      const readPromises = notifications
        .filter(notif => !notif.read)
        .map(notif => markNotificationAsRead(notif.id))
      
      await Promise.all(readPromises)
      
      // Update the notifications to reflect read status
      notifications = notifications.map(notif => ({ ...notif, read: true }))
      unreadCount = Math.max(0, unreadCount - notifications.filter(notif => !notif.read).length)
    }

    // Format notifications for mobile
    const formattedNotifications = notifications.map((notification: any) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      priority: notification.priority || 'normal',
      actionRequired: notification.actionRequired || false,
      createdAt: notification.createdAt,
      relatedTo: notification.relatedTo ? {
        id: notification.relatedTo.id,
        collection: notification.relatedTo.collection
      } : null,
      metadata: notification.metadata || {},
      // Additional fields for specific notification types
      inviteStatus: notification.inviteStatus,
      journeyTitle: notification.journeyTitle,
      journeyOwner: notification.journeyOwner
    }))

    return NextResponse.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        unreadCount,
        meta: {
          type,
          limit,
          hasMore: notifications.length === limit
        }
      }
    })
  } catch (error) {
    console.error('Mobile API: Error fetching notifications:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch notifications',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/mobile/notifications/[notificationId] - Mark notification as read
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const user = await getServerSideUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { notificationId } = await params
    const body = await request.json()
    const { action } = body // 'read', 'unread', 'delete'

    console.log(`Mobile API: ${action} notification ${notificationId}`)

    let result: boolean
    switch (action) {
      case 'read':
        result = await markNotificationAsRead(notificationId)
        break
        
      case 'delete':
        result = await deleteNotification(notificationId)
        break
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    if (result) {
      return NextResponse.json({
        success: true,
        message: `Notification ${action} successfully`
      })
    } else {
      return NextResponse.json(
        { success: false, error: `Failed to ${action} notification` },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Mobile API: Error updating notification:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/mobile/notifications/mark-all-read - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const user = await getServerSideUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log(`Mobile API: Marking all notifications as read for user ${user.id}`)

    const result = await markAllNotificationsAsRead(user.id)

    if (result) {
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to mark notifications as read' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Mobile API: Error marking all notifications as read:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to mark notifications as read',
        message: error instanceof Error ? error.message : 'Unknown error'
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
      'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 