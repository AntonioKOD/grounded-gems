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
    const journey = await payload.findByID({
      collection: 'journeys',
      id: params.id,
    })
    if (!journey) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    // Defensive: ensure all invitees are stored as { user: userId, status } with userId as a string
    const normalizedInvitees = (journey.invitees || []).map((inv: any) => ({
      user: typeof inv.user === 'object' && inv.user !== null ? inv.user.id || inv.user._id : inv.user,
      status: inv.status || 'pending',
    }))
    const inviteeIdx = normalizedInvitees.findIndex((inv: any) => String(inv.user) === String(user.id))
    if (inviteeIdx === -1) {
      return NextResponse.json({ error: 'You are not an invitee for this journey' }, { status: 403 })
    }
    if (normalizedInvitees[inviteeIdx].status !== 'pending') {
      return NextResponse.json({ error: 'Invite is not pending' }, { status: 400 })
    }
    normalizedInvitees[inviteeIdx].status = 'declined'
    const updated = await payload.update({
      collection: 'journeys',
      id: params.id,
      data: { invitees: normalizedInvitees },
    })
    // Notify owner by email and notification
    try {
      const ownerId = typeof journey.owner === 'object' && journey.owner !== null ? journey.owner.id || journey.owner._id : journey.owner
      if (ownerId) {
        const owner = await payload.findByID({ collection: 'users', id: ownerId })
        if (owner && owner.email) {
          await sendEmail({
            to: owner.email,
            subject: `Your journey invite was declined`,
            html: `<p>Hi ${owner.name || owner.email},</p><p>${user.name || user.email} has declined your invite to the journey <b>${journey.title}</b>.</p>`
          })
        } else {
          console.error('Journey owner not found or has no email:', ownerId)
        }
        // Also create a notification for the owner
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: ownerId,
            type: 'reminder',
            title: `${user.name || user.email} declined your Gem Journey invite`,
            message: `${user.name || user.email} has declined your invite to the journey "${journey.title}"`,
            relatedTo: { relationTo: 'journeys', value: journey.id },
            read: false,
          },
        })
      }
    } catch (err) {
      console.error('Error sending owner decline email or notification:', err)
    }
    return NextResponse.json({ journey: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to decline invite' }, { status: 500 })
  }
} 