import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { z } from 'zod'

// Input validation schema
const accessSchema = z.object({
  guideId: z.string().min(1, 'Guide ID is required'),
  action: z.enum(['access', 'download', 'review', 'complete']).default('access'),
  metadata: z.object({
    deviceInfo: z.object({
      platform: z.enum(['ios', 'android', 'web']).optional(),
      appVersion: z.string().optional(),
      deviceId: z.string().optional(),
    }).optional(),
    sessionDuration: z.number().optional(), // in seconds
    progress: z.number().min(0).max(100).optional(), // completion percentage
    notes: z.string().optional(),
  }).optional(),
})

interface MobileAccessResponse {
  success: boolean
  message: string
  data?: {
    accessId: string
    guideId: string
    userId: string
    action: string
    accessCount: number
    lastAccessedAt: string
    sessionDuration?: number
    progress?: number
  }
  error?: string
  code?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<MobileAccessResponse>> {
  try {
    console.log('📚 Mobile library access endpoint called')
    
    const payload = await getPayload({ config })
    console.log('✅ Payload instance created')
    
    // Get current user (required for access tracking)
    let currentUser = null
    try {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const { user } = await payload.auth({ headers: request.headers })
        currentUser = user
        console.log('👤 Current user:', currentUser?.name || 'None')
      }
    } catch (authError) {
      console.log('❌ Authentication failed:', authError)
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'Valid authentication token required to track access',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      )
    }

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'Valid authentication token required to track access',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = accessSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error.errors)
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request data',
          error: validationResult.error.errors[0]?.message,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    const { guideId, action, metadata } = validationResult.data
    console.log('📊 Access request:', { guideId, action, metadata })

    // Verify user owns this guide (has a completed purchase)
    const purchase = await payload.find({
      collection: 'guide-purchases',
      where: {
        and: [
          { user: { equals: currentUser.id } },
          { guide: { equals: guideId } },
          { status: { equals: 'completed' } }
        ]
      },
      limit: 1
    })

    if (purchase.docs.length === 0) {
      console.log('❌ User does not own guide:', { userId: currentUser.id, guideId })
      return NextResponse.json(
        {
          success: false,
          message: 'Guide not found in library',
          error: 'You do not own this guide or the purchase is not completed',
          code: 'GUIDE_NOT_OWNED'
        },
        { status: 404 }
      )
    }

    const purchaseRecord = purchase.docs[0]
    if (!purchaseRecord) {
      console.log('❌ Purchase record not found')
      return NextResponse.json(
        {
          success: false,
          message: 'Guide not found in library',
          error: 'You do not own this guide or the purchase is not completed',
          code: 'GUIDE_NOT_OWNED'
        },
        { status: 404 }
      )
    }
    console.log('✅ Purchase record found:', purchaseRecord.id)

    // Update purchase record based on action
    let updateData: any = {
      lastAccessedAt: new Date()
    }

    switch (action) {
      case 'access':
        updateData.downloadCount = (purchaseRecord.downloadCount || 0) + 1
        break
      case 'download':
        updateData.downloadCount = (purchaseRecord.downloadCount || 0) + 1
        break
      case 'review':
        updateData.hasReviewed = true
        break
      case 'complete':
        updateData.isCompleted = true
        updateData.completedAt = new Date()
        break
    }

    // Add metadata if provided
    if (metadata) {
      if (metadata.sessionDuration) {
        updateData.lastSessionDuration = metadata.sessionDuration
      }
      if (metadata.progress !== undefined) {
        updateData.progress = metadata.progress
      }
      if (metadata.deviceInfo) {
        updateData.lastDeviceInfo = metadata.deviceInfo
      }
    }

    console.log('📝 Updating purchase record with:', updateData)

    // Update the purchase record
    const updatedPurchase = await payload.update({
      collection: 'guide-purchases',
      id: purchaseRecord.id,
      data: updateData
    })

    console.log('✅ Purchase record updated successfully')

    // Create access log entry for detailed tracking
    let accessLog = null
    try {
      accessLog = await payload.create({
        collection: 'guide-access-logs',
        data: {
          user: currentUser.id,
          guide: guideId,
          purchase: purchaseRecord.id,
          action,
          metadata: metadata || {},
          accessedAt: new Date(),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })
      console.log('✅ Access log created:', accessLog.id)
    } catch (logError) {
      console.warn('⚠️ Failed to create access log:', logError)
      // Don't fail the request if logging fails
    }

    // Build response
    const response: MobileAccessResponse = {
      success: true,
      message: 'Access tracked successfully',
      data: {
        accessId: accessLog?.id ? String(accessLog.id) : 'unknown',
        guideId,
        userId: String(currentUser.id),
        action,
        accessCount: updatedPurchase.downloadCount || 0,
        lastAccessedAt: updatedPurchase.lastAccessedAt,
        sessionDuration: metadata?.sessionDuration,
        progress: metadata?.progress
      }
    }

    console.log('✅ Access tracking completed successfully')
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error: unknown) {
    console.error('❌ Mobile library access error:', error)
    if (error instanceof Error) {
      console.error('❌ Error stack:', error.stack)
    }
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? `Access tracking service unavailable: ${error.message}` : 'Access tracking service unavailable',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 