import { NextRequest, NextResponse } from 'next/server'
import { getServerSideUser } from '@/lib/auth-server'

// GET /api/mobile/locations/[locationId]/insider-tips - List tips for a location
export async function GET(request: NextRequest, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    const { locationId } = await params
    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    const payload = await getPayload({ config })
    const location = await payload.findByID({ collection: 'locations', id: locationId, depth: 0 })
    const tips = location.insiderTips || []
    return NextResponse.json({ success: true, data: { tips } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch tips' }, { status: 500 })
  }
}

// POST /api/mobile/locations/[locationId]/insider-tips - Add a tip
export async function POST(request: NextRequest, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    const { locationId } = await params
    const user = await getServerSideUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }
    const body = await request.json()
    const { category, tip, priority } = body
    if (!category || !tip) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }
    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    const payload = await getPayload({ config })
    // Add tip to location
    const updated = await payload.update({
      collection: 'locations',
      id: locationId,
      data: {
        insiderTips: [
          ...(Array.isArray((await payload.findByID({ collection: 'locations', id: locationId, depth: 0 })).insiderTips) ? (await payload.findByID({ collection: 'locations', id: locationId, depth: 0 })).insiderTips : []),
          {
            category,
            tip,
            priority: priority || 'medium',
            source: 'user_submitted',
            submittedBy: user.id,
            submittedAt: new Date().toISOString(),
            status: 'pending'
          }
        ]
      }
    })
    return NextResponse.json({ success: true, data: { tip: updated.insiderTips?.slice(-1)[0] } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to add tip' }, { status: 500 })
  }
} 