import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { sendEmail, journeyInviteEmailTemplate } from '@/lib/email'

export async function POST(req: NextRequest, context: any) {
  const params = typeof context.params?.then === 'function' ? await context.params : context.params || {};
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const journey = await payload.findByID({
      collection: 'journeys',
      id: params.id,
    })
    if (!journey) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const ownerId = typeof journey.owner === 'object' && journey.owner !== null
      ? journey.owner.id || journey.owner._id
      : journey.owner;
    if (!ownerId || String(ownerId) !== String(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { inviteeId } = await req.json()
    // Check if already invited
    const alreadyInvited = (journey.invitees || []).some((inv: any) => String(inv.user) === String(inviteeId))
    if (alreadyInvited) return NextResponse.json({ error: 'User already invited' }, { status: 400 })
    // Defensive: ensure all invitees are stored as { user: userId, status } with userId as a string
    const normalizedInvitees = (journey.invitees || []).map((inv: any) => ({
      user: typeof inv.user === 'object' && inv.user !== null ? inv.user.id || inv.user._id : inv.user,
      status: inv.status || 'pending',
    }))
    const updated = await payload.update({
      collection: 'journeys',
      id: params.id,
      data: {
        invitees: [...normalizedInvitees, { user: inviteeId, status: 'pending' }],
      },
    })
    // Create notification
    const notificationData = {
      recipient: inviteeId,
      type: 'reminder',
      title: `${user.name || user.email} invited you to join a Gem Journey`,
      message: `You have been invited to join the journey "${journey.title}"`,
      relatedTo: { relationTo: 'journeys', value: journey.id },
      read: false,
    }
    console.log('Creating notification:', notificationData)
    await payload.create({
      collection: 'notifications',
      data: notificationData,
    })
    // Send email invite
    try {
      // Fetch invitee user by ID
      const invitee = await payload.findByID({
        collection: 'users',
        id: inviteeId,
      })
      if (!invitee) {
        console.error('Invitee user not found for ID:', inviteeId)
      } else if (!invitee.email) {
        console.error('Invitee user has no email:', invitee)
      } else {
        const emailData = {
          inviteeName: invitee.name || '',
          inviteeEmail: invitee.email,
          journeyTitle: journey.title,
          journeySummary: journey.summary,
          inviterName: user.name || user.email,
          journeyUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/journey/${journey.id}`,
        }
        console.log('Sending invite email to:', invitee.email, emailData)
        await sendEmail(journeyInviteEmailTemplate(emailData))
      }
    } catch (err) {
      console.error('Error sending invite email:', err)
    }
    return NextResponse.json({ journey: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to invite user' }, { status: 500 })
  }
} 