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
    // Defensive: ensure all invitees are stored as { user: userId, status } with userId as a string
    const normalizedInvitees = (journey.invitees || []).map((inv: any) => ({
      user: typeof inv.user === 'object' && inv.user !== null ? inv.user.id || inv.user._id : inv.user,
      status: inv.status || 'pending',
    }))
    // Check if invitee is pending
    const inviteeObj = normalizedInvitees.find((inv: any) => String(inv.user) === String(inviteeId))
    if (!inviteeObj || inviteeObj.status !== 'pending') return NextResponse.json({ error: 'Not a pending invitee' }, { status: 400 })
    // Send invite email and notification
    try {
      const invitee = await payload.findByID({ collection: 'users', id: inviteeId })
      if (invitee?.email) {
        const journeyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile/${inviteeId}/journey/${journey.id}`
        const emailTemplate = journeyInviteEmailTemplate({
          inviteeName: invitee.name || '',
          inviteeEmail: invitee.email,
          journeyTitle: journey.title,
          journeySummary: journey.summary,
          inviterName: user.name || user.email,
          journeyUrl,
        })
        await sendEmail({
          to: invitee.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        })
      }
      const notificationData = {
        recipient: inviteeId,
        type: 'reminder',
        title: `${user.name || user.email} re-sent your Gem Journey invite`,
        message: `You have been re-invited to join the journey "${journey.title}"`,
        relatedTo: { relationTo: 'journeys', value: journey.id },
        read: false,
      }
      console.log('Creating notification:', notificationData)
      await payload.create({
        collection: 'notifications',
        data: notificationData,
      })
    } catch (err) {
      console.error('Error resending invite:', err)
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to resend invite' }, { status: 500 })
  }
} 