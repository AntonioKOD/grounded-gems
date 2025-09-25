import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Vercel Blob upload API called')
    console.log('🚀 Request headers:', Object.fromEntries(request.headers.entries()))
    
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
    
    // For now, skip media document creation and use blob URLs directly
    // This avoids the complex hooks in the Media collection that might be failing
    const mediaId = `blob_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    console.log('🚀 Using blob URL directly, skipping media document creation')
    
    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully to blob storage',
      id: mediaId,
      filename: file.name,
      url: blob.url,
      mimeType: file.type,
      filesize: file.size,
      blobUrl: blob.url
    })

  } catch (error) {
    console.error('🚀 Vercel Blob upload error:', error)
    
    return NextResponse.json(
      { success: false, message: 'Failed to upload file' },
      { status: 500 }
    )
  }
} 