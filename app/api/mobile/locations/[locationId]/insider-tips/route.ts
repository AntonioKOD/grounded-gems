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

    // Validate tip length (minimum 10 characters like web version)
    if (tip.trim().length < 10) {
      return NextResponse.json({ success: false, error: 'Tip must be at least 10 characters long' }, { status: 400 })
    }

    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    const payload = await getPayload({ config })

    // Get current location to get existing tips and validate location exists
    let location;
    try {
      location = await payload.findByID({ 
        collection: 'locations', 
        id: locationId, 
        depth: 1 
      })
    } catch (error) {
      return NextResponse.json({ success: false, error: 'Location not found' }, { status: 404 })
    }

    // Check for duplicate tips from the same user (matching web API logic)
    const existingTips = location.insiderTips || []
    const userTips = existingTips.filter((existingTip: any) => 
      existingTip.source === 'user_submitted' && 
      existingTip.tip?.toLowerCase().trim() === tip.toLowerCase().trim()
    )

    if (userTips.length > 0) {
      return NextResponse.json({ success: false, error: 'This tip has already been submitted' }, { status: 400 })
    }
    
    // Create the new tip (matching web API structure)
    const newTip = {
      category,
      tip: tip.trim(),
      priority: priority || 'medium',
      isVerified: false,
      source: 'user_submitted' as const,
      status: 'pending' as const,
      submittedBy: user.id,
      submittedAt: new Date().toISOString(),
    }

    // Add new tip to the array
    const updatedTips = [...existingTips, newTip]

    // Update location with new tips array
    await payload.update({
      collection: 'locations',
      id: locationId,
      data: {
        insiderTips: updatedTips
      }
    })

    // Create notification for location owner (if different from submitter) - matching web API
    if (location.createdBy && location.createdBy !== user.id) {
      try {
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: typeof location.createdBy === 'string' ? location.createdBy : location.createdBy.id,
            type: 'tip_submission',
            title: 'New Insider Tip Submitted',
            message: `${user.name || 'Someone'} shared an insider tip for ${location.name}`,
            actionBy: user.id,
            priority: 'normal',
            relatedTo: {
              relationTo: 'locations',
              value: locationId,
            },
            metadata: {
              locationName: location.name,
              tipCategory: category,
              tipPreview: tip.substring(0, 50) + (tip.length > 50 ? '...' : ''),
            },
            read: false,
          },
        })
      } catch (error) {
        console.error('[INSIDER TIPS] Error creating notification:', error)
      }
    }

    console.log('[INSIDER TIPS] Successfully added tip:', newTip);

    return NextResponse.json({ 
      success: true, 
      message: 'Insider tip submitted successfully',
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