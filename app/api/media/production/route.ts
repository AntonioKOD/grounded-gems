import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

// Production-optimized configuration
export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Production media upload API called')
    
    // Check request size
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const sizeMB = parseInt(contentLength) / 1024 / 1024
      console.log(`📊 Production upload size: ${sizeMB.toFixed(2)}MB`)
      
      // Higher limit for production (100MB)
      if (sizeMB > 100) {
        console.error(`📝 Production upload too large: ${sizeMB.toFixed(2)}MB`)
        return NextResponse.json(
          { success: false, message: `File too large (${sizeMB.toFixed(2)}MB). Maximum size is 100MB.` },
          { status: 413 }
        )
      }
    }
    
    const payload = await getPayload({ config: payloadConfig })
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const alt = formData.get('alt') as string

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      )
    }

    console.log(`🚀 Uploading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

    // Create media document with proper file handling
    const media = await payload.create({
      collection: 'media',
      data: {
        alt: alt || file.name,
        uploadSource: 'mobile',
      },
      file: {
        data: Buffer.from(await file.arrayBuffer()),
        mimetype: file.type,
        name: file.name,
        size: file.size,
      },
    })

    console.log('🚀 Media uploaded successfully:', media.id)

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      id: media.id,
      filename: media.filename,
      url: media.url,
      mimeType: media.mimeType,
      filesize: media.filesize
    })

  } catch (error) {
    console.error('🚀 Production media upload error:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
        return NextResponse.json(
          { success: false, message: 'File too large. Please compress or use a smaller file.' },
          { status: 413 }
        )
      }
      
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { success: false, message: 'Upload timed out. Please try again.' },
          { status: 408 }
        )
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to upload file' },
      { status: 500 }
    )
  }
} 