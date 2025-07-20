import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import fs from 'fs'
import path from 'path'

// Production-optimized configuration
export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Store chunk uploads in memory (in production, use Redis or database)
const chunkUploads = new Map<string, { chunks: Buffer[], fileName: string, fileType: string, totalChunks: number }>()

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Chunked upload API called')
    
    const formData = await request.formData()
    const chunk = formData.get('chunk') as File
    const uploadId = formData.get('uploadId') as string
    const chunkIndex = parseInt(formData.get('chunkIndex') as string)
    const totalChunks = parseInt(formData.get('totalChunks') as string)
    const fileName = formData.get('fileName') as string
    const fileType = formData.get('fileType') as string
    const alt = formData.get('alt') as string

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
        fileType,
        totalChunks
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

    // If this is the last chunk, merge and create media document
    if (chunkIndex === totalChunks - 1) {
      console.log(`📦 All chunks received, merging file: ${fileName}`)
      
      try {
        // Merge all chunks
        const completeFileBuffer = Buffer.concat(upload.chunks)
        
        // Create a temporary file
        const tempDir = path.join(process.cwd(), 'temp')
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true })
        }
        
        const tempFilePath = path.join(tempDir, `${uploadId}-${fileName}`)
        fs.writeFileSync(tempFilePath, completeFileBuffer)
        
        // Create media document using Payload
        const payload = await getPayload({ config: payloadConfig })
        
        const media = await payload.create({
          collection: 'media',
          data: {
            alt: alt || fileName,
            uploadSource: 'mobile',
          },
          file: {
            data: completeFileBuffer,
            mimetype: fileType,
            name: fileName,
            size: completeFileBuffer.length,
          },
        })
        
        // Clean up temporary file
        try {
          fs.unlinkSync(tempFilePath)
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp file:', cleanupError)
        }
        
        // Remove from memory
        chunkUploads.delete(uploadId)
        
        console.log('🚀 Chunked upload completed successfully:', media.id)
        
        return NextResponse.json({
          success: true,
          message: 'File uploaded successfully',
          id: media.id,
          filename: media.filename,
          url: media.url,
          mimeType: media.mimeType,
          filesize: media.filesize
        })
        
      } catch (mergeError) {
        console.error('❌ Error merging chunks:', mergeError)
        chunkUploads.delete(uploadId)
        return NextResponse.json(
          { success: false, message: 'Failed to merge file chunks' },
          { status: 500 }
        )
      }
    }

    // Return success for intermediate chunks
    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`,
      uploadId,
      chunkIndex
    })

  } catch (error) {
    console.error('🚀 Chunked upload error:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
        return NextResponse.json(
          { success: false, message: 'Chunk too large. Please use smaller chunks.' },
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
      { success: false, message: 'Failed to upload chunk' },
      { status: 500 }
    )
  }
} 