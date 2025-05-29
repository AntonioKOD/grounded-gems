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
    // (Removed: do not notify or email the user when removed from a journey)
    return NextResponse.json({ journey: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to remove invitee' }, { status: 500 })
  }
} 