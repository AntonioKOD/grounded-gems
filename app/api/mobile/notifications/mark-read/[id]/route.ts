import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getPayload({ config })
    
    // Use the same auth method as the GET endpoint
    const { user } = await payload.auth({ headers: req.headers });
    if (!user) {
      console.log('Mark-read: No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id: notificationId } = await context.params;
    console.log(`Mark-read: User ${user.id} trying to mark notification ${notificationId} as read`);
    
    // Find the notification and ensure it belongs to the user
    const notification = await payload.findByID({
      collection: 'notifications',
      id: notificationId,
    });
    
    if (!notification) {
      console.log(`Mark-read: Notification ${notificationId} not found`);
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    // Extract recipient ID properly - handle both string and object cases
    const recipientId = typeof notification.recipient === 'string' 
      ? notification.recipient 
      : notification.recipient?.id || notification.recipient;
    
    console.log(`Mark-read: Found notification ${notificationId}, recipient: ${recipientId}, user: ${user.id}`);
    
    if (recipientId !== user.id) {
      console.log(`Mark-read: Recipient mismatch - notification recipient: ${recipientId}, user: ${user.id}`);
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    // Mark as read
    await payload.update({
      collection: 'notifications',
      id: notificationId,
      data: { read: true },
    });
    
    console.log(`Mark-read: Successfully marked notification ${notificationId} as read`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 