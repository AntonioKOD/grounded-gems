import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(req: NextRequest, context: any) {
  const params = typeof context.params?.then === 'function' ? await context.params : context.params || {};
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const journey = await payload.findByID({
      collection: 'journeys',
      id: params.id,
      depth: 2, // Populate referenced locations
    })
    
    if (!journey) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    
    // Only allow if user is owner or invitee
    let ownerId = journey.owner
    if (typeof ownerId === 'object' && ownerId !== null) {
      ownerId = ownerId.id || ownerId._id
    }
    const isOwner = ownerId && String(ownerId) === String(user.id)
    const isInvitee = (journey.invitees || []).some((inv: any) => String(inv.user) === String(user.id))
    if (!isOwner && !isInvitee) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    
    return NextResponse.json({ journey })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch journey' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: any) {
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
    // Only owner can update
    let patchOwnerId = journey.owner
    if (typeof patchOwnerId === 'object' && patchOwnerId !== null) {
      patchOwnerId = patchOwnerId.id || patchOwnerId._id
    }
    if (!patchOwnerId || String(patchOwnerId) !== String(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await req.json()
    const updated = await payload.update({
      collection: 'journeys',
      id: params.id,
      data: body,
    })
    return NextResponse.json({ journey: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update journey' }, { status: 500 })
  }
} 