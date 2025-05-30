import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')?.value

    return NextResponse.json({
      success: true,
      message: 'Debug route working',
      timestamp: new Date().toISOString(),
      cookies: {
        payloadToken: payloadToken ? 'exists' : 'missing',
        allCookies: cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
      },
      headers: {
        cookie: request.headers.get('cookie') || 'none',
        userAgent: request.headers.get('user-agent') || 'none'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Debug route error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')?.value

    return NextResponse.json({
      success: true,
      message: 'Debug POST route working',
      receivedBody: body,
      timestamp: new Date().toISOString(),
      cookies: {
        payloadToken: payloadToken ? 'exists' : 'missing',
        allCookies: cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
      },
      headers: {
        cookie: request.headers.get('cookie') || 'none',
        contentType: request.headers.get('content-type') || 'none'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to parse JSON',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
} 