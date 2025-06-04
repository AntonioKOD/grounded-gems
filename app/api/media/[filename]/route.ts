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

    // Check if file exists locally
    if (!fs.existsSync(filePath)) {
      // If using Vercel Blob Storage and local file doesn't exist, 
      // try to proxy to the blob storage URL
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          // Generate blob URL - Vercel blob URLs follow pattern: https://[token].public.blob.vercel-storage.com/[filename]
          const blobHostname = process.env.BLOB_READ_WRITE_TOKEN.replace('vercel_blob_rw_', '') + '.public.blob.vercel-storage.com'
          const blobUrl = `https://${blobHostname}/${filename}`
          
          console.log(`📦 Proxying media request to blob storage: ${blobUrl}`)
          
          // Fetch from blob storage
          const blobResponse = await fetch(blobUrl)
          
          if (blobResponse.ok) {
            const contentType = blobResponse.headers.get('content-type') || 'application/octet-stream'
            const body = await blobResponse.arrayBuffer()
            
            return new NextResponse(body, {
              status: 200,
              headers: {
                'Content-Type': contentType,
                'Content-Length': body.byteLength.toString(),
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Content-Disposition': `inline; filename="${filename}"`,
              },
            })
          } else {
            console.warn(`📦 Blob storage request failed with status: ${blobResponse.status}`)
          }
        } catch (blobError) {
          console.error('📦 Error proxying to blob storage:', blobError)
        }
      }
      
      return new NextResponse('File not found', { status: 404 })
    }

    // Get file stats
    const stats = fs.statSync(filePath)
    const fileSize = stats.size

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
      // Video formats
      case '.mp4':
        contentType = 'video/mp4'
        break
      case '.webm':
        contentType = 'video/webm'
        break
      case '.ogg':
        contentType = 'video/ogg'
        break
      case '.mov':
        contentType = 'video/quicktime'
        break
      case '.avi':
        contentType = 'video/x-msvideo'
        break
    }

    // Handle range requests for video streaming
    const range = request.headers.get('range')
    const isVideo = contentType.startsWith('video/')

    if (range && isVideo) {
      // Parse range header
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunksize = (end - start) + 1
      
      // Read the requested chunk
      const fileBuffer = Buffer.alloc(chunksize)
      const fd = fs.openSync(filePath, 'r')
      fs.readSync(fd, fileBuffer, 0, chunksize, start)
      fs.closeSync(fd)

      // Return partial content with range headers
      return new NextResponse(fileBuffer, {
        status: 206, // Partial Content
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    } else {
      // Read full file for images or if no range requested
      const fileBuffer = fs.readFileSync(filePath)

      // Return file with appropriate headers
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Disposition': `inline; filename="${filename}"`,
          ...(isVideo && { 'Accept-Ranges': 'bytes' }),
        },
      })
    }

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

    // Check if file exists locally
    if (!fs.existsSync(filePath)) {
      // If using Vercel Blob Storage and local file doesn't exist, 
      // try to proxy to the blob storage URL
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          // Generate blob URL - Vercel blob URLs follow pattern: https://[token].public.blob.vercel-storage.com/[filename]
          const blobHostname = process.env.BLOB_READ_WRITE_TOKEN.replace('vercel_blob_rw_', '') + '.public.blob.vercel-storage.com'
          const blobUrl = `https://${blobHostname}/${filename}`
          
          console.log(`📦 HEAD request - Proxying to blob storage: ${blobUrl}`)
          
          // Fetch HEAD from blob storage
          const blobResponse = await fetch(blobUrl, { method: 'HEAD' })
          
          if (blobResponse.ok) {
            const contentType = blobResponse.headers.get('content-type') || 'application/octet-stream'
            const contentLength = blobResponse.headers.get('content-length') || '0'
            
            return new NextResponse(null, {
              status: 200,
              headers: {
                'Content-Type': contentType,
                'Content-Length': contentLength,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Accept-Ranges': 'bytes',
              },
            })
          } else {
            console.warn(`📦 HEAD request - Blob storage request failed with status: ${blobResponse.status}`)
          }
        } catch (blobError) {
          console.error('📦 HEAD request - Error proxying to blob storage:', blobError)
        }
      }
      
      return new NextResponse(null, { status: 404 })
    }

    // Get file stats for local files
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
      // Video formats
      case '.mp4':
        contentType = 'video/mp4'
        break
      case '.webm':
        contentType = 'video/webm'
        break
      case '.ogg':
        contentType = 'video/ogg'
        break
      case '.mov':
        contentType = 'video/quicktime'
        break
      case '.avi':
        contentType = 'video/x-msvideo'
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
        'Accept-Ranges': 'bytes',
      },
    })

  } catch (error) {
    console.error('Media HEAD error:', error)
    return new NextResponse(null, { status: 500 })
  }
} 