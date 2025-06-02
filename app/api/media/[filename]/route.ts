/**
 * Media File Serving API Route
 * 
 * Serves uploaded media files from the manual upload system.
 * This route handles files that were uploaded via the mobile upload API
 * to bypass Payload's automatic file processing.
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface RouteParams {
  params: Promise<{ filename: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { filename } = await params

    // Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Invalid filename', { status: 400 })
    }

    // Construct file path
    const mediaDir = path.join(process.cwd(), 'media')
    const filePath = path.join(mediaDir, filename)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 })
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath)

    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg'
        break
      case '.png':
        contentType = 'image/png'
        break
      case '.gif':
        contentType = 'image/gif'
        break
      case '.webp':
        contentType = 'image/webp'
        break
      case '.svg':
        contentType = 'image/svg+xml'
        break
    }

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })

  } catch (error) {
    console.error('Media serving error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

// Handle HEAD requests for file metadata
export async function HEAD(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { filename } = await params

    // Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse(null, { status: 400 })
    }

    // Construct file path
    const mediaDir = path.join(process.cwd(), 'media')
    const filePath = path.join(mediaDir, filename)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return new NextResponse(null, { status: 404 })
    }

    // Get file stats
    const stats = fs.statSync(filePath)

    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg'
        break
      case '.png':
        contentType = 'image/png'
        break
      case '.gif':
        contentType = 'image/gif'
        break
      case '.webp':
        contentType = 'image/webp'
        break
      case '.svg':
        contentType = 'image/svg+xml'
        break
    }

    // Return headers without body
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Last-Modified': stats.mtime.toUTCString(),
      },
    })

  } catch (error) {
    console.error('Media HEAD error:', error)
    return new NextResponse(null, { status: 500 })
  }
} 