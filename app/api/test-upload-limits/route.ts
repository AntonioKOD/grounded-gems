import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get('content-length')
    const contentType = request.headers.get('content-type')
    
    console.log('🧪 Test upload limits endpoint called')
    console.log(`📊 Content-Length: ${contentLength}`)
    console.log(`📊 Content-Type: ${contentType}`)
    
    if (contentLength) {
      const sizeMB = parseInt(contentLength) / 1024 / 1024
      console.log(`📊 Request size: ${sizeMB.toFixed(2)}MB`)
      
      if (sizeMB > 4.5) {
        return NextResponse.json({
          success: false,
          message: `Request too large: ${sizeMB.toFixed(2)}MB`,
          limit: '4.5MB',
          received: `${sizeMB.toFixed(2)}MB`
        }, { status: 413 })
      }
    }
    
    // Try to read the request body
    let body
    try {
      if (contentType?.includes('multipart/form-data')) {
        body = await request.formData()
        console.log('✅ Successfully parsed FormData')
      } else if (contentType?.includes('application/json')) {
        body = await request.json()
        console.log('✅ Successfully parsed JSON')
      } else {
        body = await request.text()
        console.log('✅ Successfully parsed as text')
      }
    } catch (error) {
      console.error('❌ Error parsing request body:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to parse request body',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Upload limits test successful',
      size: contentLength ? `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)}MB` : 'Unknown',
      contentType: contentType || 'Unknown',
      bodyType: typeof body,
      bodySize: body ? JSON.stringify(body).length : 0
    })
    
  } catch (error) {
    console.error('❌ Test endpoint error:', error)
    return NextResponse.json({
      success: false,
      message: 'Test endpoint failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Upload limits test endpoint is working',
    limits: {
      maxPayloadSize: '4.5MB',
      maxDuration: '300s',
      runtime: 'nodejs'
    },
    instructions: 'Send a POST request with data to test upload limits'
  })
} 