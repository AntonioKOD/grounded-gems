import { NextRequest, NextResponse } from 'next/server'
import { getServerSideUser } from '@/lib/auth-server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(req: NextRequest) {
  const user = await getServerSideUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const payload = await getPayload({ config })
  // Fetch user with savedGemJourneys (could be IDs or objects)
  const dbUser = await payload.findByID({ collection: 'users', id: user.id, depth: 0 })
  const savedJourneyIds = Array.isArray(dbUser.savedGemJourneys)
    ? dbUser.savedGemJourneys.map((j: any) => typeof j === 'string' ? j : j.id || j._id)
    : []
  if (!savedJourneyIds.length) {
    return NextResponse.json({ plans: [] })
  }
  // Fetch full journey objects
  const journeys = await payload.find({
    collection: 'journeys',
    where: { id: { in: savedJourneyIds } },
    depth: 2,
    limit: 100,
  })
  return NextResponse.json({ plans: journeys.docs })
}

export async function POST(req: NextRequest) {
  const user = await getServerSideUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { journeyId } = await req.json()
    const payload = await getPayload({ config })
    const dbUser = await payload.findByID({ collection: 'users', id: user.id })
    // Prevent duplicates
    const alreadySaved = Array.isArray(dbUser.savedGemJourneys) && dbUser.savedGemJourneys.includes(journeyId)
    if (alreadySaved) return NextResponse.json({ success: true })
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        savedGemJourneys: [...(dbUser.savedGemJourneys || []), journeyId]
      }
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
} 