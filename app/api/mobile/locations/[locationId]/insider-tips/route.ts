import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth-server'

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
    console.error('[INSIDER TIPS] Error in GET:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tips' }, { status: 500 })
  }
}

// POST /api/mobile/locations/[locationId]/insider-tips - Add a tip
export async function POST(request: NextRequest, { params }: { params: Promise<{ locationId: string }> }) {
  try {
    console.log('[INSIDER TIPS] POST called');
    const { locationId } = await params;
    console.log('[INSIDER TIPS] locationId:', locationId);

    // Get current user using mobile authentication
    let user;
    try {
      user = await getMobileUser(request);
      console.log('[INSIDER TIPS] user:', user);
    } catch (userError) {
      console.error('[INSIDER TIPS] Error in getMobileUser:', userError);
      return NextResponse.json({ error: 'User auth error', details: userError instanceof Error ? userError.message : userError }, { status: 500 });
    }

    if (!user) {
      console.warn('[INSIDER TIPS] No user found');
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('[INSIDER TIPS] request body:', body);
    } catch (bodyError) {
      console.error('[INSIDER TIPS] Error parsing request body:', bodyError);
      return NextResponse.json({ error: 'Invalid request body', details: bodyError instanceof Error ? bodyError.message : bodyError }, { status: 400 });
    }

    const { category, tip, priority } = body
    if (!category || !tip) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    const payload = await getPayload({ config })

    // Get current location to get existing tips
    const currentLocation = await payload.findByID({ 
      collection: 'locations', 
      id: locationId, 
      depth: 0 
    })
    
    const existingTips = currentLocation.insiderTips || []
    const newTip = {
      category,
      tip,
      priority: priority || 'medium',
      source: 'user_submitted',
      submittedBy: user.id,
      submittedAt: new Date().toISOString(),
      status: 'pending'
    }

    // Add new tip to the array
    const updatedTips = [...existingTips, newTip]

    // Update location with new tips array
    const updated = await payload.update({
      collection: 'locations',
      id: locationId,
      data: {
        insiderTips: updatedTips
      }
    })

    console.log('[INSIDER TIPS] Successfully added tip:', newTip);

    return NextResponse.json({ 
      success: true, 
      data: { 
        tip: newTip,
        totalTips: updatedTips.length
      } 
    })
  } catch (error) {
    console.error('[INSIDER TIPS] Error in POST:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to add tip',
      details: error instanceof Error ? error.message : error 
    }, { status: 500 })
  }
} 