import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Vercel Blob upload API called')
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const alt = formData.get('alt') as string

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      )
    }

    console.log(`🚀 Uploading file to Vercel Blob: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

    // Upload directly to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    console.log('🚀 File uploaded to Vercel Blob:', blob.url)

    // Create media document in Payload with the blob URL
    const payload = await getPayload({ config: payloadConfig })
    
    try {
      const media = await payload.create({
        collection: 'media',
        data: {
          alt: alt || file.name,
          uploadSource: 'web',
          filename: file.name,
          mimeType: file.type,
          filesize: file.size,
          url: blob.url, // Use the Vercel Blob URL
        },
      })

      console.log('🚀 Media document created:', media.id)

      return NextResponse.json({
        success: true,
        message: 'File uploaded successfully',
        id: media.id,
        filename: media.filename,
        url: media.url,
        mimeType: media.mimeType,
        filesize: media.filesize,
        blobUrl: blob.url
      })
    } catch (mediaError) {
      console.error('🚀 Error creating media document:', mediaError)
      
      // Return the blob URL even if media document creation fails
      return NextResponse.json({
        success: true,
        message: 'File uploaded to blob storage, but media document creation failed',
        id: null,
        filename: file.name,
        url: blob.url,
        mimeType: file.type,
        filesize: file.size,
        blobUrl: blob.url,
        warning: 'Media document not created in database'
      })
    }

  } catch (error) {
    console.error('🚀 Vercel Blob upload error:', error)
    
    return NextResponse.json(
      { success: false, message: 'Failed to upload file' },
      { status: 500 }
    )
  }
} 