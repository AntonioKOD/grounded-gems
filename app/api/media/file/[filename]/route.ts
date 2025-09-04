import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Force dynamic rendering to avoid route caching
export const dynamic = 'force-dynamic'

/**
 * Robust MP4 Streaming API Route
 * 
 * Features:
 * - Range-aware streaming with 206 Partial Content responses
 * - Proper headers for AVPlayer compatibility
 * - Memory-efficient streaming (no buffering entire files)
 * - Support for both local files and blob storage
 * - Comprehensive error handling and logging
 * 
 * Testing:
 * - curl -I "https://sacavia.com/api/media/file/test.mp4" (check headers)
 * - curl -i -H "Range: bytes=0-1023" "https://sacavia.com/api/media/file/test.mp4" (test range)
 * 
 * MP4 Fast Start (for legacy uploads):
 * - ffmpeg -i input.mp4 -c copy -movflags +faststart output.mp4
 * - This moves the moov atom to the front for better streaming
 */

// GET /api/media/file/[filename] - Serve media file by filename with robust streaming
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const startTime = Date.now()
  
  try {
    const { filename } = await params
    const method = request.method
    const url = request.url
    const range = request.headers.get('range')
    
    console.log(`📦 [${method}] ${url} - Range: ${range || 'none'}`)

    // First check if we have blob storage enabled
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      console.log(`📦 Using blob storage for: ${filename}`)
      
      try {
        return await handleBlobStorageRequest(filename, range, request)
      } catch (blobError) {
        console.error(`❌ Blob storage error for ${filename}:`, blobError)
        // Fall through to local file serving
      }
    }

    // Local file serving with robust range support
    return await handleLocalFileRequest(filename, range, request)

  } catch (error) {
    console.error('❌ Error serving media file:', error)
    return new NextResponse('Internal server error', { status: 500 })
  } finally {
    const duration = Date.now() - startTime
    console.log(`📦 Request completed in ${duration}ms`)
  }
}

// Handle blob storage requests with range support
async function handleBlobStorageRequest(
  filename: string, 
  range: string | null, 
  request: NextRequest
): Promise<NextResponse> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN!
  const blobHostname = blobToken?.split('_')[3]?.toLowerCase() + '.public.blob.vercel-storage.com'
  const blobUrl = `https://${blobHostname}/${filename}`
  
  console.log(`📦 Blob URL: ${blobUrl}`)
  
  // Prepare headers for upstream request
  const upstreamHeaders: HeadersInit = {}
  if (range) {
    upstreamHeaders['Range'] = range
  }
  
  const fileResponse = await fetch(blobUrl, {
    headers: upstreamHeaders
  })
  
  if (!fileResponse.ok) {
    console.log(`❌ Blob storage request failed: ${fileResponse.status}`)
    return new NextResponse('File not found in blob storage', { status: 404 })
  }

  const contentType = fileResponse.headers.get('content-type') || getContentType(filename)
  const contentLength = fileResponse.headers.get('content-length') || '0'
  const contentRange = fileResponse.headers.get('content-range')
  const acceptRanges = fileResponse.headers.get('accept-ranges') || 'bytes'
  
  // Get response body as stream
  const body = fileResponse.body
  
  if (!body) {
    return new NextResponse('No content', { status: 204 })
  }

  // Prepare response headers
  const responseHeaders: HeadersInit = {
    'Content-Type': contentType,
    'Content-Length': contentLength,
    'Cache-Control': 'public, max-age=3600, immutable',
    'Content-Disposition': `inline; filename="${filename}"`,
    'Accept-Ranges': acceptRanges,
  }
  
  // Add range-specific headers if present
  if (contentRange) {
    responseHeaders['Content-Range'] = contentRange
  }
  
  // Return streaming response
  return new NextResponse(body, {
    status: fileResponse.status,
    headers: responseHeaders,
  })
}

// Handle local file requests with robust range support
async function handleLocalFileRequest(
  filename: string, 
  range: string | null, 
  request: NextRequest
): Promise<NextResponse> {
  const mediaDir = path.join(process.cwd(), 'media')
  const filePath = path.join(mediaDir, filename)
  
  console.log(`📦 Checking local file: ${filePath}`)

  // Security check: ensure the file is within the media directory
  const resolvedFilePath = path.resolve(filePath)
  const resolvedMediaDir = path.resolve(mediaDir)
  
  if (!resolvedFilePath.startsWith(resolvedMediaDir)) {
    console.log(`❌ Security violation: File path outside media directory`)
    return new NextResponse('Access denied', { status: 403 })
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Local file not found: ${filePath}`)
    
    // Try to find the media record in the database to see if it should exist
    try {
      const payload = await getPayload({ config })
      const mediaDoc = await payload.find({
        collection: 'media',
        where: {
          filename: { equals: filename }
        },
        limit: 1
      })
      
      if (mediaDoc.docs.length > 0) {
        console.log(`📦 Media record found in database but file missing on disk`)
        return new NextResponse('File exists in database but not on disk', { status: 404 })
      } else {
        console.log(`📦 No media record found for filename: ${filename}`)
      }
    } catch (dbError) {
      console.error(`❌ Database query error:`, dbError)
    }
    
    return new NextResponse('File not found', { status: 404 })
  }

  // Get file stats
  const stats = fs.statSync(filePath)
  const contentType = getContentType(filename)
  
  // Handle range requests for video streaming
  if (range && contentType.startsWith('video/')) {
    return handleRangeRequest(filePath, range, stats.size, contentType)
  }
  
  // For non-range requests, still stream the file (don't buffer in memory)
  const fileStream = fs.createReadStream(filePath)
  
  console.log(`✅ Streaming local file: ${filename} (${stats.size} bytes)`)
  
  return new NextResponse(fileStream as any, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'public, max-age=3600, immutable',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Accept-Ranges': 'bytes',
      'Last-Modified': stats.mtime.toUTCString(),
    },
  })
}

// Handle HTTP range requests for video streaming with robust error handling
function handleRangeRequest(
  filePath: string, 
  range: string, 
  fileSize: number, 
  contentType: string
): NextResponse {
  console.log(`📦 Handling range request: ${range} for file size: ${fileSize}`)
  
  // Parse range header: "bytes=start-end"
  const rangeMatch = range.match(/bytes=(\d+)-(\d*)/)
  if (!rangeMatch || !rangeMatch[1]) {
    console.log(`❌ Invalid range format: ${range}`)
    return new NextResponse('Invalid range format', { 
      status: 416,
      headers: {
        'Content-Range': `bytes */${fileSize}`,
        'Accept-Ranges': 'bytes',
      }
    })
  }
  
  const start = parseInt(rangeMatch[1], 10)
  const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : fileSize - 1
  
  console.log(`📦 Range: ${start}-${end} (file size: ${fileSize})`)
  
  // Validate range
  if (start >= fileSize || end >= fileSize || start > end) {
    console.log(`❌ Range out of bounds: ${start}-${end} (file size: ${fileSize})`)
    return new NextResponse('Range not satisfiable', { 
      status: 416,
      headers: {
        'Content-Range': `bytes */${fileSize}`,
        'Accept-Ranges': 'bytes',
      }
    })
  }
  
  const chunkSize = end - start + 1
  
  try {
    // Create read stream for the specific range (memory efficient)
    const fileStream = fs.createReadStream(filePath, { 
      start: start, 
      end: end,
      highWaterMark: 64 * 1024 // 64KB chunks for better performance
    })
    
    console.log(`✅ Streaming range ${start}-${end} (${chunkSize} bytes)`)
    
    return new NextResponse(fileStream as any, {
      status: 206, // Partial Content
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, immutable',
      },
    })
  } catch (error) {
    console.error(`❌ Error creating range stream:`, error)
    return new NextResponse('Error reading file range', { status: 500 })
  }
}

// Get content type based on file extension - comprehensive image format support
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  
  const mimeTypes: Record<string, string> = {
    // Modern image formats
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    
    // Legacy image formats
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.ico': 'image/x-icon',
    '.icon': 'image/x-icon',
    
    // Professional image formats
    '.jp2': 'image/jp2',
    '.jpx': 'image/jpx',
    '.jpm': 'image/jpm',
    '.psd': 'image/vnd.adobe.photoshop',
    '.raw': 'image/x-canon-crw',
    '.pbm': 'image/x-portable-bitmap',
    '.ppm': 'image/x-portable-pixmap',
    
    // Videos
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.m4v': 'video/x-m4v',
    
    // Default
    '': 'application/octet-stream'
  }
  
  return mimeTypes[ext] || 'application/octet-stream'
} 