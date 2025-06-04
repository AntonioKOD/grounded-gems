import { NextRequest, NextResponse } from 'next/server'

/**
 * Development Media Proxy
 * 
 * This route serves as a fallback for external media URLs that don't work in development.
 * It provides placeholder images to prevent infinite loading states.
 */

export async function GET(request: NextRequest) {
  // Only work in development environment
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const originalUrl = searchParams.get('url')
  const width = parseInt(searchParams.get('width') || '400')
  const height = parseInt(searchParams.get('height') || '300')
  const type = searchParams.get('type') || 'image'

  if (!originalUrl) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
  }

  console.log(`🔧 Dev Media Proxy: Serving placeholder for ${originalUrl}`)

  try {
    // Try to fetch the original URL first
    const response = await fetch(originalUrl, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Sacavia-Dev-Proxy/1.0'
      }
    })

    if (response.ok) {
      // If the original URL works, redirect to it
      return NextResponse.redirect(originalUrl)
    }
  } catch (error) {
    // URL is not accessible, serve placeholder
    console.log(`📸 Dev Media Proxy: Original URL failed, serving placeholder`)
  }

  // Generate a placeholder URL based on the type
  let placeholderUrl: string

  if (type === 'video') {
    // For videos, return a video placeholder or thumbnail
    placeholderUrl = `https://via.placeholder.com/${width}x${height}/1a1a1a/ffffff?text=Video+Placeholder`
  } else {
    // For images, return a nice placeholder
    const colors = [
      '6366f1/ffffff', // Indigo
      'f59e0b/ffffff', // Amber  
      'ef4444/ffffff', // Red
      '10b981/ffffff', // Emerald
      '8b5cf6/ffffff', // Violet
      'f97316/ffffff', // Orange
    ]
    
    // Use a consistent color based on the URL hash
    const colorIndex = Math.abs(originalUrl.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length
    const color = colors[colorIndex]
    
    placeholderUrl = `https://via.placeholder.com/${width}x${height}/${color}?text=Image+Placeholder`
  }

  // Redirect to the placeholder
  return NextResponse.redirect(placeholderUrl)
} 