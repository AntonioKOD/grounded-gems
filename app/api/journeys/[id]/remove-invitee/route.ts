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
    const ownerId = typeof journey.owner === 'object' && journey.owner !== null
      ? journey.owner.id || journey.owner._id
      : journey.owner;
    if (!ownerId || String(ownerId) !== String(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { inviteeId } = await req.json()
    // Defensive: ensure all invitees are stored as { user: userId, status } with userId as a string
    const normalizedInvitees = (journey.invitees || []).map((inv: any) => ({
      user: typeof inv.user === 'object' && inv.user !== null ? inv.user.id || inv.user._id : inv.user,
      status: inv.status || 'pending',
    }))
    const newInvitees = normalizedInvitees.filter((inv: any) => String(inv.user) !== String(inviteeId))
    const updated = await payload.update({
      collection: 'journeys',
      id: params.id,
      data: { invitees: newInvitees },
    })
    // Notify removed user
    try {
      const invitee = await payload.findByID({ collection: 'users', id: inviteeId })
      if (invitee?.email) {
        const journeyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile/${inviteeId}/journey/${journey.id}`
        await sendEmail({
          to: invitee.email,
          subject: `You have been removed from a Gem Journey: ${journey.title}`,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF6B6B;">You have been removed from a Gem Journey</h2>
            <p>Hi ${invitee.name || invitee.email},</p>
            <p>You have been removed from the journey <strong>"${journey.title}"</strong> by the owner.</p>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Journey Details</h3>
              <p><strong>Title:</strong> ${journey.title}</p>
              <p><strong>Summary:</strong> ${journey.summary}</p>
            </div>
            <p>If you think this was a mistake, you can contact the journey owner.</p>
            <p style="margin-top: 32px; color: #888; font-size: 13px;">— The Grounded Gems Team</p>
          </div>`
        })
      }
      const notificationData = {
        recipient: inviteeId,
        type: 'reminder',
        title: `You have been removed from the journey "${journey.title}"`,
        message: `You are no longer an invitee for this journey.`,
        relatedTo: { relationTo: 'journeys', value: journey.id },
        read: false,
      }
      console.log('Creating notification:', notificationData)
      await payload.create({
        collection: 'notifications',
        data: notificationData,
      })
    } catch (err) {
      console.error('Error notifying removed invitee:', err)
    }
    return NextResponse.json({ journey: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to remove invitee' }, { status: 500 })
  }
} 