import { NextRequest, NextResponse } from 'next/server'

// Global OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  // Define allowed origins
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001', // Mobile app dev server
    'http://localhost:8081', // Expo dev server
    'https://www.sacavia.com', // Production web app
  ]
  
  // Check if origin is allowed or if it's a mobile app (no origin)
  const isAllowed = !origin || // Mobile apps often don't send origin
    allowedOrigins.includes(origin) ||
    (process.env.NODE_ENV === 'development' && (
      origin.includes('localhost') || 
      origin.includes('192.168.') || 
      origin.includes('exp://')
    ))
  
  if (!isAllowed) {
    return new NextResponse(null, { status: 403 })
  }
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export async function GET() {
  return Response.json({
    message: 'Sacavia API is running',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    cors: [
      'http://localhost:3000',
      'https://www.sacavia.com', // Production web app
    ],
  })
} 