import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const journey = await payload.findByID({
      collection: 'journeys',
      id: params.id,
    })
    if (!journey) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { status } = await req.json()
    // Only allow the invitee to update their own status
    const invitees = journey.invitees || []
    const inviteeIdx = invitees.findIndex((i: any) => String(i.user) === String(user.id))
    if (inviteeIdx === -1) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    invitees[inviteeIdx].status = status
    const updated = await payload.update({
      collection: 'journeys',
      id: params.id,
      data: { invitees },
    })
    return NextResponse.json({ journey: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update invite status' }, { status: 500 })
  }
} 