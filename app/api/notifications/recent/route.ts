/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/notifications/recent/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function GET() {
  try {
    console.log('=== Recent Notifications API Called ===')
    
    // 1) Grab the Payload session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get('payload-token')?.value;
    
    console.log('Token exists:', !!token)
    
    if (!token) {
      console.log('No authentication token found')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2) Initialize Payload and verify the JWT
    const payload = await getPayload({config});
    let decoded;
    try {
      decoded = await (payload.auth as any).verifyJWT(token);
      console.log('JWT decoded successfully, user ID:', decoded.id)
    } catch (error) {
      console.log('JWT verification failed:', error)
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const userId = decoded.id; // Payload puts the user ID here

    // 3) Fetch recent notifications
    console.log(`Fetching notifications for user: ${userId}`)
    
    const { docs: notifications } = await payload.find({
      collection: 'notifications',
      where: { recipient: { equals: userId } },
      sort: '-createdAt',
      limit: 10,
      depth: 2,
    });

    console.log(`Found ${notifications.length} notifications`)

    // Format notifications for frontend
    const formattedNotifications = notifications.map((notification) => ({
      id: String(notification.id),
      recipient: notification.recipient,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedTo: notification.relatedTo
        ? {
            id: typeof notification.relatedTo === "object" ? notification.relatedTo.id : notification.relatedTo,
            collection: notification.relatedTo.relationTo,
          }
        : undefined,
      read: notification.read,
      createdAt: notification.createdAt,
      actionBy: notification.actionBy,
      metadata: notification.metadata,
      priority: notification.priority,
      actionRequired: notification.actionRequired,
    }))

    return NextResponse.json({ 
      notifications: formattedNotifications,
      count: formattedNotifications.length,
      userId 
    });
  } catch (error) {
    console.error('Error in recent notifications API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 });
  }
}