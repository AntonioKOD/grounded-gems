import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get all device tokens
    const deviceTokens = await payload.find({
      collection: 'deviceTokens',
      limit: 100
    })

    // Format the response to show key information
    const formattedTokens = deviceTokens.docs.map(token => ({
      id: token.id,
      deviceToken: token.deviceToken,
      fcmToken: token.fcmToken,
      user: token.user,
      platform: token.platform,
      isActive: token.isActive,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt
    }))

    return NextResponse.json({
      success: true,
      totalTokens: deviceTokens.totalDocs,
      tokens: formattedTokens
    })

  } catch (error) {
    console.error('❌ [Debug Device Tokens] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch device tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
