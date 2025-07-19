import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🧪 [TEST] iOS app test endpoint called')
  console.log('🧪 [TEST] Headers:', Object.fromEntries(request.headers.entries()))
  
  return NextResponse.json({
    success: true,
    message: 'iOS app can reach the server!',
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(request.headers.entries())
  })
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