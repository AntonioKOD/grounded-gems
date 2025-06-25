import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest, context: any) {
  const params = typeof context.params?.then === 'function' ? await context.params : context.params || {};
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const event = await payload.findByID({
      collection: 'events',
      id: params.id,
    })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    
    // Check if user is the event organizer
    const organizerId = typeof event.organizer === 'object' && event.organizer !== null
      ? event.organizer.id || event.organizer._id
      : event.organizer;
    if (!organizerId || String(organizerId) !== String(user.id)) {
      return NextResponse.json({ error: 'Only the event organizer can invite users' }, { status: 403 });
    }
    
    const { inviteeId } = await req.json()
    
    // Check if user is already attending
    const existingRSVP = await payload.find({
      collection: 'eventRSVPs',
      where: {
        and: [
          { event: { equals: event.id } },
          { user: { equals: inviteeId } }
        ]
      },
      limit: 1
    })
    
    if (existingRSVP.docs.length > 0) {
      return NextResponse.json({ error: 'User is already attending this event' }, { status: 400 })
    }
    
    // Create event RSVP for the invited user
    const rsvp = await payload.create({
      collection: 'eventRSVPs',
      data: {
        event: event.id,
        user: inviteeId,
        status: 'invited',
        invitedBy: user.id,
        invitedAt: new Date().toISOString(),
      },
    })
    
    // Create notification for the invited user
    const notificationData = {
      recipient: inviteeId,
      type: 'event_invite',
      title: `${user.name || user.email} invited you to an event`,
      message: `You have been invited to "${event.name}" on ${new Date(event.startDate).toLocaleDateString()}`,
      relatedTo: { relationTo: 'events', value: event.id },
      actionBy: user.id,
      metadata: {
        eventName: event.name,
        eventDate: event.startDate,
        organizerName: user.name || user.email,
      },
      read: false,
    }
    
    await payload.create({
      collection: 'notifications',
      data: notificationData,
    })
    
    // Send email invite
    try {
      const invitee = await payload.findByID({
        collection: 'users',
        id: inviteeId,
      })
      
      if (invitee?.email) {
        const emailData = {
          to: invitee.email,
          subject: `You're invited to ${event.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You're invited to ${event.name}!</h2>
              <p>Hi ${invitee.name || invitee.email},</p>
              <p>${user.name || user.email} has invited you to join their event:</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>${event.name}</h3>
                <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${new Date(event.startDate).toLocaleTimeString()}</p>
                <p><strong>Location:</strong> ${typeof event.location === 'object' ? event.location.name : 'Event Location'}</p>
                <p>${event.description}</p>
              </div>
              <p>Click the link below to view the event and respond to the invitation:</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/${event.id}" 
                 style="background: #FF6B6B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Event
              </a>
            </div>
          `
        }
        
        await sendEmail(emailData)
      }
    } catch (err) {
      console.error('Error sending invite email:', err)
    }
    
    return NextResponse.json({ 
      success: true, 
      rsvp,
      message: 'User invited successfully' 
    })
    
  } catch (err: any) {
    console.error('Error inviting user to event:', err)
    return NextResponse.json({ error: err.message || 'Failed to invite user' }, { status: 500 })
  }
} 