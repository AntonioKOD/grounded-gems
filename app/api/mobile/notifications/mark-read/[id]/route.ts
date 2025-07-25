import { NextRequest, NextResponse } from 'next/server';
import payload from 'payload';
import { getMobileUser } from '../../../../../../lib/auth-server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getMobileUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const notificationId = params.id;
    // Find the notification and ensure it belongs to the user
    const notification = await payload.findByID({
      collection: 'notifications',
      id: notificationId,
    });
    if (!notification || notification.user !== user.id) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    // Mark as read
    await payload.update({
      collection: 'notifications',
      id: notificationId,
      data: { read: true },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 