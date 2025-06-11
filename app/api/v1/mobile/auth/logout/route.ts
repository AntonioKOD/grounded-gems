import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface MobileLogoutResponse {
  success: boolean
  message: string
  data?: null
  error?: string
  code?: string
}

// Helper function to verify JWT token using Payload's verification
async function verifyPayloadToken(token: string) {
  try {
    const payload = await getPayload({ config })
    
    // Use Payload's JWT verification method
    const decoded = payload.jwt.verify(token)
    
    if (decoded && typeof decoded === 'object' && 'id' in decoded && 'email' in decoded) {
      return {
        id: decoded.id as string,
        email: decoded.email as string
      }
    }
    
    return null
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<MobileLogoutResponse>> {
  try {
    console.log('📱 Mobile logout endpoint called')

    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid authorization header found for logout')
      return NextResponse.json({
        success: false,
        message: 'Authentication token required',
        error: 'MISSING_TOKEN',
        code: 'AUTH_001'
      }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🔑 Extracted token for logout:', token.substring(0, 20) + '...')

    // Verify the JWT token using Payload's verification
    const tokenData = await verifyPayloadToken(token)
    if (!tokenData) {
      console.log('❌ Token verification failed during logout')
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired authentication token',
        error: 'INVALID_TOKEN',
        code: 'AUTH_002'
      }, { status: 401 })
    }

    console.log('✅ Token verified for logout, user:', tokenData.id)

    // Get Payload instance
    const payload = await getPayload({ config })

    // Verify user exists
    const user = await payload.findByID({
      collection: 'users',
      id: tokenData.id
    })

    if (!user) {
      console.log('❌ User not found during logout:', tokenData.id)
      return NextResponse.json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND',
        code: 'AUTH_003'
      }, { status: 404 })
    }

    console.log('✅ User logout successful for:', user.email)

    // For mobile logout, we typically just acknowledge the logout
    // The client is responsible for clearing the token
    // In a more sophisticated system, you might invalidate the token server-side
    
    return NextResponse.json({
      success: true,
      message: 'Logout successful',
      data: null
    })

  } catch (error) {
    console.error('❌ Mobile logout endpoint error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR',
      code: 'AUTH_500'
    }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
} 