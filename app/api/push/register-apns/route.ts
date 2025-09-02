import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: NextRequest) {
  try {
    const { 
      apnsToken,
      fcmToken,
      userId,
      platform = 'ios',
      deviceInfo
    } = await request.json()

    if (!apnsToken) {
      return NextResponse.json(
        { error: 'apnsToken is required' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config })

    // Check if APNs token already exists
    const existingToken = await payload.find({
      collection: 'deviceTokens',
      where: {
        apnsToken: { equals: apnsToken }
      },
      limit: 1
    })

    if (existingToken.docs.length > 0) {
      // Update existing token
      const tokenDoc = existingToken.docs[0]
      if (!tokenDoc) {
        return NextResponse.json(
          { error: 'Token document not found' },
          { status: 404 }
        )
      }
      
      await payload.update({
        collection: 'deviceTokens',
        id: tokenDoc.id,
        data: {
          apnsToken,
          fcmToken,
          user: userId,
          platform,
          isActive: true,
          lastUsed: new Date().toISOString(),
          deviceInfo
        }
      })

      console.log(`✅ [APNs] Updated existing APNs token: ${apnsToken.substring(0, 20)}...`)
      
      return NextResponse.json({
        success: true,
        message: 'APNs token updated successfully',
        tokenId: tokenDoc.id,
        apnsToken: apnsToken.substring(0, 20) + '...',
        platform,
        isActive: true
      })
    } else {
      // Create new APNs token
      const newToken = await payload.create({
        collection: 'deviceTokens',
        data: {
          apnsToken,
          fcmToken,
          user: userId,
          platform,
          isActive: true,
          lastUsed: new Date().toISOString(),
          deviceInfo
        }
      })

      console.log(`✅ [APNs] Created new APNs token: ${apnsToken.substring(0, 20)}...`)
      
      return NextResponse.json({
        success: true,
        message: 'APNs token registered successfully',
        tokenId: newToken.id,
        apnsToken: apnsToken.substring(0, 20) + '...',
        platform,
        isActive: true
      })
    }

  } catch (error) {
    console.error('❌ [APNs] Error registering APNs token:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to register APNs token',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const payload = await getPayload({ config })
    
    let whereClause: any = { isActive: { equals: true } }
    if (userId) {
      whereClause = {
        and: [
          { user: { equals: userId } },
          { isActive: { equals: true } }
        ]
      }
    }

    const tokens = await payload.find({
      collection: 'deviceTokens',
      where: whereClause,
      limit: 100
    })

    const apnsTokens = tokens.docs
      .filter(token => token.apnsToken)
      .map(token => ({
        id: token.id,
        apnsToken: token.apnsToken?.substring(0, 20) + '...',
        platform: token.platform,
        user: token.user,
        lastUsed: token.lastUsed
      }))

    return NextResponse.json({
      success: true,
      apnsTokens,
      totalCount: apnsTokens.length
    })

  } catch (error) {
    console.error('❌ [APNs] Error getting APNs tokens:', error)
    return NextResponse.json(
      { error: 'Failed to get APNs tokens' },
      { status: 500 }
    )
  }
}
