import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/media/file/[filename] - Serve media file by filename
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    
    console.log(`📦 Serving media file by filename: ${filename}`)

    // First check if we have blob storage enabled
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      console.log(`📦 Using blob storage for: ${filename}`)
      
      // Construct blob URL - extract hostname from blob token
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN
      const blobHostname = blobToken?.split('_')[3]?.toLowerCase() + '.public.blob.vercel-storage.com'
      const blobUrl = `https://${blobHostname}/${filename}`
      
      console.log(`📦 Blob URL: ${blobUrl}`)
      
      try {
        const fileResponse = await fetch(blobUrl)
        
        if (!fileResponse.ok) {
          console.log(`❌ Blob storage request failed: ${fileResponse.status}`)
          return new NextResponse('File not found in blob storage', { status: 404 })
        }

        // Get the file content and headers
        const contentType = fileResponse.headers.get('content-type') || getContentType(filename)
        const contentLength = fileResponse.headers.get('content-length') || '0'
        const body = await fileResponse.arrayBuffer()

        // Return the file with appropriate headers
        return new NextResponse(body, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': contentLength,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Disposition': `inline; filename="${filename}"`,
            'Accept-Ranges': 'bytes',
          },
        })
      } catch (blobError) {
        console.error(`❌ Blob storage error for ${filename}:`, blobError)
        // Fall through to local file serving
      }
    }

    // Local file serving
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
    
    // Determine content type
    const contentType = getContentType(filename)
    
    // Handle range requests for video streaming
    const range = request.headers.get('range')
    
    if (range && contentType.startsWith('video/')) {
      return handleRangeRequest(filePath, range, stats.size, contentType)
    }
    
    // Read and serve the file
    const fileBuffer = fs.readFileSync(filePath)
    
    console.log(`✅ Serving local file: ${filename} (${stats.size} bytes)`)
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Accept-Ranges': 'bytes',
        'Last-Modified': stats.mtime.toUTCString(),
      },
    })

  } catch (error) {
    console.error('❌ Error serving media file:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

// Handle HTTP range requests for video streaming
function handleRangeRequest(
  filePath: string, 
  range: string, 
  fileSize: number, 
  contentType: string
): NextResponse {
  const parts = range.replace(/bytes=/, "").split("-")
  const start = parseInt(parts[0] || '0', 10)
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
  const chunksize = (end - start) + 1
  const fileStream = fs.createReadStream(filePath, { start: start, end: end })
  const buffer = Buffer.alloc(chunksize)
  fs.readSync(fs.openSync(filePath, 'r'), buffer, 0, chunksize, start)

  return new NextResponse(buffer, {
    status: 206, // Partial Content
    headers: {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize.toString(),
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
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