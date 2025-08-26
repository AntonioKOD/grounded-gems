import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    
    return NextResponse.json({
      success: true,
      message: 'Server connection successful',
      timestamp: new Date().toISOString(),
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role
      } : null,
      server: {
        environment: process.env.NODE_ENV,
        version: '1.0.0'
      }
    })

  } catch (error) {
    console.error('Error in test endpoint:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 