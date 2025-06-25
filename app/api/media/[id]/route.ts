import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET /api/media/[id] - Serve media file by Payload CMS media document ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config })
    const { id } = await params

    console.log(`📦 Serving media file for ID: ${id}`)

    // Get the media document from Payload CMS
    const mediaDoc = await payload.findByID({
      collection: 'media',
      id: id
    })

    if (!mediaDoc) {
      console.log(`❌ Media document not found for ID: ${id}`)
      return new NextResponse('Media not found', { status: 404 })
    }

    // Get the file URL from the media document
    // For Vercel Blob storage, the URL should be in the filename field
    const fileUrl = mediaDoc.url || mediaDoc.filename

    if (!fileUrl) {
      console.log(`❌ No file URL found for media ID: ${id}`)
      return new NextResponse('File not found', { status: 404 })
    }

    console.log(`📦 File URL from media doc: ${fileUrl}`)

    // If it's already a full URL (like Vercel Blob URL), use it directly
    if (fileUrl.startsWith('http')) {
      console.log(`📦 Proxying to external URL: ${fileUrl}`)
      
      const fileResponse = await fetch(fileUrl)

      if (!fileResponse.ok) {
        console.log(`❌ External file request failed with status: ${fileResponse.status}`)
        return new NextResponse('File not found', { status: 404 })
      }

      // Get the file content and headers
      const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream'
      const contentLength = fileResponse.headers.get('content-length') || '0'
      const body = await fileResponse.arrayBuffer()

      // Return the file with appropriate headers
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': contentLength,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Disposition': `inline; filename="${mediaDoc.filename || 'file'}"`,
        },
      })
    } else {
      // If it's a filename, construct the Vercel Blob URL
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blobHostname = process.env.BLOB_READ_WRITE_TOKEN.replace('vercel_blob_rw_', '') + '.public.blob.vercel-storage.com'
        const blobUrl = `https://${blobHostname}/${fileUrl}`
        
        console.log(`📦 Constructed blob URL: ${blobUrl}`)
        
        const fileResponse = await fetch(blobUrl)

        if (!fileResponse.ok) {
          console.log(`❌ Blob storage request failed with status: ${fileResponse.status}`)
          return new NextResponse('File not found', { status: 404 })
        }

        // Get the file content and headers
        const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream'
        const contentLength = fileResponse.headers.get('content-length') || '0'
        const body = await fileResponse.arrayBuffer()

        // Return the file with appropriate headers
        return new NextResponse(body, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': contentLength,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Disposition': `inline; filename="${mediaDoc.filename || 'file'}"`,
          },
        })
      } else {
        console.log(`❌ No blob storage token available for filename: ${fileUrl}`)
        return new NextResponse('File not found', { status: 404 })
      }
    }

  } catch (error) {
    console.error('❌ Error serving media file:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
} 