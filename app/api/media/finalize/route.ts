import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import fs from 'fs'
import path from 'path'

// Configure for large payloads
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes timeout

// Store chunk uploads in memory (in production, use Redis or database)
const chunkUploads = new Map<string, { chunks: Buffer[], fileName: string, fileType: string }>()

export async function POST(request: NextRequest) {
  try {
    const { uploadId, fileName, fileType } = await request.json()

    if (!uploadId || !fileName || !fileType) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const upload = chunkUploads.get(uploadId)
    if (!upload) {
      return NextResponse.json(
        { success: false, message: 'Upload session not found' },
        { status: 404 }
      )
    }

    // Check if all chunks are present
    const missingChunks = upload.chunks.some(chunk => !chunk)
    if (missingChunks) {
      return NextResponse.json(
        { success: false, message: 'Some chunks are missing' },
        { status: 400 }
      )
    }

    // Combine all chunks into a single buffer
    const combinedBuffer = Buffer.concat(upload.chunks)
    
    // Create a File object from the combined buffer
    const file = new File([combinedBuffer], fileName, { type: fileType })

    console.log(`📦 Finalizing upload: ${fileName} (${(combinedBuffer.length / 1024 / 1024).toFixed(2)}MB)`)

    // Upload to Payload CMS
    const payload = await getPayload({ config: payloadConfig })
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('alt', fileName)

    // Create media document
    const mediaDoc = await payload.create({
      collection: 'media',
      data: {
        alt: fileName,
        uploadSource: 'mobile',
      },
      file: file,
    })

    // Clean up chunks
    chunkUploads.delete(uploadId)

    console.log(`✅ Chunked upload finalized successfully: ${mediaDoc.id}`)

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      id: mediaDoc.id,
      filename: mediaDoc.filename,
      url: mediaDoc.url
    })

  } catch (error) {
    console.error('❌ Finalization error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to finalize upload' },
      { status: 500 }
    )
  }
} 