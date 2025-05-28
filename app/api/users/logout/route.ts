import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Clear the payload-token cookie
  const response = NextResponse.json({ success: true })
  response.cookies.set('payload-token', '', { path: '/', expires: new Date(0) })
  return response
} 