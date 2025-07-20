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
    const formData = await request.formData()
    const chunk = formData.get('chunk') as File
    const uploadId = formData.get('uploadId') as string
    const chunkIndex = parseInt(formData.get('chunkIndex') as string)
    const totalChunks = parseInt(formData.get('totalChunks') as string)
    const fileName = formData.get('fileName') as string
    const fileType = formData.get('fileType') as string

    if (!chunk || !uploadId || isNaN(chunkIndex) || isNaN(totalChunks) || !fileName || !fileType) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Convert chunk to buffer
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer())

    // Initialize upload tracking if this is the first chunk
    if (chunkIndex === 0) {
      chunkUploads.set(uploadId, {
        chunks: new Array(totalChunks),
        fileName,
        fileType
      })
    }

    const upload = chunkUploads.get(uploadId)
    if (!upload) {
      return NextResponse.json(
        { success: false, message: 'Upload session not found' },
        { status: 404 }
      )
    }

    // Store the chunk
    upload.chunks[chunkIndex] = chunkBuffer

    console.log(`📦 Chunk ${chunkIndex + 1}/${totalChunks} uploaded for ${fileName}`)

    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`,
      uploadId,
      chunkIndex
    })

  } catch (error) {
    console.error('❌ Chunk upload error:', error)
    return NextResponse.json(
      { success: false, message: 'Chunk upload failed' },
      { status: 500 }
    )
  }
} 