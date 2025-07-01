import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const since = url.searchParams.get('since')
    const limit = parseInt(url.searchParams.get('limit') || '10')

    // Build query conditions
    const whereConditions: any = {
      recipient: { equals: user.id }
    }

    // If since parameter is provided, only fetch notifications after that time
    if (since) {
      whereConditions.createdAt = {
        greater_than: since
      }
    }

    // Fetch notifications
    const notifications = await payload.find({
      collection: 'notifications',
      where: whereConditions,
      limit,
      sort: '-createdAt',
      depth: 2, // Include related data
    })

    // Format notifications for frontend
    const formattedNotifications = notifications.docs.map((notification: any) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      priority: notification.priority || 'normal',
      actionRequired: notification.actionRequired || false,
      createdAt: notification.createdAt,
      actionBy: notification.actionBy ? {
        id: notification.actionBy.id,
        name: notification.actionBy.name,
        profileImage: notification.actionBy.profileImage
      } : null,
      relatedTo: notification.relatedTo ? {
        id: notification.relatedTo.value?.id || notification.relatedTo.value,
        collection: notification.relatedTo.relationTo
      } : null,
      metadata: notification.metadata || {}
    }))

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
      total: notifications.totalDocs,
      hasMore: notifications.hasNextPage
    })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
} 