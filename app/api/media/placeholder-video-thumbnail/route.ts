import { NextResponse } from "next/server"

export async function GET() {
  // Create a simple SVG placeholder with video icon
  const svgContent = `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FF6B6B;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#4ECDC4;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#grad1)"/>
      <rect x="20" y="20" width="360" height="260" rx="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
      
      <!-- Video play icon -->
      <circle cx="200" cy="150" r="50" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
      <polygon points="185,130 185,170 225,150" fill="rgba(255,255,255,0.9)"/>
      
      <!-- Video text -->
      <text x="200" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="rgba(255,255,255,0.9)">
        Video
      </text>
      <text x="200" y="240" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.7)">
        Click to play
      </text>
    </svg>
  `

  return new NextResponse(svgContent, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
} 