import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ params: string[] }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { params: pathParams } = await params
    
    // Parse width and height from params (e.g., /api/placeholder/400/400)
    const width = parseInt(pathParams[0] || '400')
    const height = parseInt(pathParams[1] || '400')
    
    // Validate dimensions
    const validWidth = Math.min(Math.max(width, 50), 2000) // Between 50 and 2000px
    const validHeight = Math.min(Math.max(height, 50), 2000)
    
    // Generate a simple SVG placeholder
    const svg = `
      <svg width="${validWidth}" height="${validHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="system-ui, sans-serif" font-size="${Math.min(validWidth, validHeight) / 10}" fill="white" opacity="0.8">
          ${validWidth}×${validHeight}
        </text>
      </svg>
    `.trim()
    
    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Content-Length': Buffer.byteLength(svg, 'utf8').toString(),
      },
    })
    
  } catch (error) {
    console.error('Placeholder API error:', error)
    
    // Fallback minimal SVG
    const fallbackSvg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#e5e7eb"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="sans-serif" font-size="20" fill="#6b7280">
          Image
        </text>
      </svg>
    `.trim()
    
    return new NextResponse(fallbackSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }
}

// Handle HEAD requests
export async function HEAD(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  })
} 