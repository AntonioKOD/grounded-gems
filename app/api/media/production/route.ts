import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

// Production-optimized configuration
export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Optimized retry function with faster backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      // Check if it's a MongoDB WriteConflict error
      const isWriteConflict = error instanceof Error && 
        (error.message.includes('WriteConflict') || 
         error.message.includes('code: 112') ||
         error.message.includes('Please retry your operation'))
      
      if (isWriteConflict && attempt < maxRetries) {
        // Faster retry with shorter delays
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 200
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // For non-retryable errors or max retries reached, throw immediately
      throw error
    }
  }
  
  throw lastError!
}

export async function POST(request: NextRequest) {
  try {
    // Check request size
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const sizeMB = parseInt(contentLength) / 1024 / 1024
      
      // Higher limit for production (100MB)
      if (sizeMB > 100) {
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

    // Create media document with optimized retry mechanism
    const media = await retryWithBackoff(async () => {
      return await payload.create({
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
    }, 2, 100) // Reduced retries and faster delays

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
      // MongoDB WriteConflict error
      if (error.message.includes('WriteConflict') || 
          error.message.includes('code: 112') ||
          error.message.includes('Please retry your operation')) {
        return NextResponse.json(
          { success: false, message: 'Upload conflict detected. Please try again in a moment.' },
          { status: 409 }
        )
      }
      
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
      { success: false, message: 'Failed to upload file. Please try again.' },
      { status: 500 }
    )
  }
} 