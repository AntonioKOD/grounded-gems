import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const journey = await payload.create({
      collection: 'journeys',
      data: {
        ...body,
        owner: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
    return NextResponse.json({ journey })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create journey' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Fetch journeys where user is owner or invitee
    const journeys = await payload.find({
      collection: 'journeys',
      where: {
        or: [
          { owner: { equals: user.id } },
          { 'invitees.user': { equals: user.id } },
        ],
      },
      sort: '-createdAt',
      limit: 100,
    })
    return NextResponse.json({ journeys: journeys.docs })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch journeys' }, { status: 500 })
  }
} 