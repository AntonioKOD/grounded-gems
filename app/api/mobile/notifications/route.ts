import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/mobile/notifications - List notifications for the current user (mobile)
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    // Get user from auth
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    
    console.log(`Mobile notifications: Fetching notifications for user ${user.id}`);
    
    // Fetch only notifications for the current user
    const result = await payload.find({
      collection: 'notifications',
      where: { recipient: { equals: user.id } },
      page,
      limit,
      sort: '-createdAt',
      depth: 1
    })
    
    console.log(`Mobile notifications: Found ${result.docs.length} notifications for user ${user.id}`);
    
    const notifications = result.docs.map((n: any) => {
      const notification = {
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
        metadata: n.metadata || {},
        actionBy: n.actionBy || null,
        relatedTo: n.relatedTo || null
      };
      console.log(`Mobile notifications: Returning notification ID: ${notification.id}, recipient: ${n.recipient} (type: ${typeof n.recipient}), read: ${n.read} (type: ${typeof n.read})`);
      return notification;
    })
    
    return NextResponse.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.totalDocs,
          totalPages: result.totalPages,
          hasNext: result.hasNextPage,
          hasPrev: result.hasPrevPage
        }
      }
    })
  } catch (error) {
    console.error('Mobile notifications GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// PUT /api/mobile/notifications/[notificationId] - Mark notification as read/unread/delete
export async function PUT(request: NextRequest, { params }: { params: { notificationId: string } }) {
  try {
    const payload = await getPayload({ config })
    const { notificationId } = params
    const body = await request.json()
    const { action } = body // 'read', 'unread', 'delete'

    // TODO: Get user from auth
    // const { user } = await payload.auth({ headers: request.headers })
    // if (!user) { ... }

    let result
    switch (action) {
      case 'read':
        result = await payload.update({
          collection: 'notifications',
          id: notificationId,
          data: { read: true }
        })
        break
      case 'unread':
        result = await payload.update({
          collection: 'notifications',
          id: notificationId,
          data: { read: false }
        })
        break
      case 'delete':
        await payload.delete({
          collection: 'notifications',
          id: notificationId
        })
        return NextResponse.json({ success: true, message: 'Notification deleted' })
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }
    return NextResponse.json({ success: true, message: `Notification marked as ${action}` })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update notification' }, { status: 500 })
  }
}

// POST /api/mobile/notifications/mark-all-read - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    // TODO: Get user from auth
    // const { user } = await payload.auth({ headers: request.headers })
    // if (!user) { ... }
    // Placeholder: mark all notifications as read for all users (replace with user-specific logic)
    const result = await payload.update({
      collection: 'notifications',
      where: { read: { equals: false } },
      data: { read: true }
    })
    return NextResponse.json({ success: true, message: 'All notifications marked as read' })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to mark all as read' }, { status: 500 })
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