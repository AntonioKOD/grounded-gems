import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import path from 'path'
import fs from 'fs'

// Queue for batch conversions
const batchConversionQueue: Array<{
  id: string
  filePath: string
  outputPath: string
  resolve: (value: boolean) => void
  reject: (error: Error) => void
}> = []

let isProcessingBatchQueue = false

// Process batch conversion queue sequentially
const processBatchQueue = async () => {
  if (isProcessingBatchQueue || batchConversionQueue.length === 0) return
  
  isProcessingBatchQueue = true
  
  while (batchConversionQueue.length > 0) {
    const task = batchConversionQueue.shift()
    if (!task) continue
    
    try {
      const result = await convertHeicToJpeg(task.filePath, task.outputPath)
      task.resolve(result)
    } catch (error) {
      task.reject(error as Error)
    }
    
    // Small delay between conversions
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  isProcessingBatchQueue = false
}

// Helper function to safely load Sharp
const loadSharp = async () => {
  try {
    const sharp = await import('sharp')
    return sharp.default
  } catch (error) {
    console.error('❌ Failed to load Sharp library:', error)
    return null
  }
}

// Helper function to convert HEIC to JPEG
const convertHeicToJpeg = async (filePath: string, outputPath: string) => {
  try {
    const sharp = await loadSharp()
    if (!sharp) {
      throw new Error('Sharp library not available')
    }

    if (!fs.existsSync(filePath)) {
      throw new Error('Original file not found')
    }

    await sharp(filePath)
      .jpeg({ quality: 90 })
      .toFile(outputPath)

    return true
  } catch (error) {
    console.error('❌ Error converting HEIC to JPEG:', error)
    return false
  }
}

// Helper function to queue batch conversion
const queueBatchConversion = async (filePath: string, outputPath: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    batchConversionQueue.push({
      id: path.basename(filePath),
      filePath,
      outputPath,
      resolve,
      reject
    })
    
    processBatchQueue()
  })
}

// Helper function to generate unique filename
const generateUniqueFilename = (originalPath: string, baseDir: string): string => {
  const ext = path.extname(originalPath)
  const baseName = path.basename(originalPath, ext)
  let counter = 1
  let newPath = path.join(baseDir, `${baseName}${ext}`)
  
  while (fs.existsSync(newPath)) {
    newPath = path.join(baseDir, `${baseName}_${counter}${ext}`)
    counter++
  }
  
  return newPath
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get user from session
    const { user } = await payload.auth({ headers: req.headers })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { mediaId } = body

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      )
    }

    // Get the media document
    const mediaDoc = await payload.findByID({
      collection: 'media',
      id: mediaId,
    })

    if (!mediaDoc) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      )
    }

    // Check if it's a Live Photo that needs conversion
    if (mediaDoc.mimeType !== 'image/heic' && mediaDoc.mimeType !== 'image/heif') {
      return NextResponse.json(
        { error: 'File is not a Live Photo (HEIC/HEIF)' },
        { status: 400 }
      )
    }

    if (mediaDoc.conversionStatus === 'converted') {
      return NextResponse.json(
        { error: 'Live Photo already converted' },
        { status: 400 }
      )
    }

    console.log('🔄 Converting Live Photo:', mediaDoc.filename)

    const mediaDir = path.join(process.cwd(), 'media')
    const filePath = path.join(mediaDir, mediaDoc.filename)
    
    // Generate unique output path to prevent conflicts
    const baseName = path.basename(mediaDoc.filename, path.extname(mediaDoc.filename))
    const timestamp = Date.now()
    const uniqueOutputPath = path.join(mediaDir, `${baseName}_${timestamp}.jpg`)

    // Queue the conversion
    const conversionSuccess = await queueBatchConversion(filePath, uniqueOutputPath)

    if (conversionSuccess) {
      // Update the document
      const newFilename = path.basename(uniqueOutputPath)
      
      await payload.update({
        collection: 'media',
        id: mediaId,
        data: {
          filename: newFilename,
          mimeType: 'image/jpeg',
          conversionStatus: 'converted',
        },
      })

      // Remove the original HEIC file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }

      console.log('✅ Live Photo converted successfully:', newFilename)

      return NextResponse.json({
        success: true,
        message: 'Live Photo converted successfully',
        data: {
          id: mediaId,
          newFilename,
          originalFormat: mediaDoc.originalFormat,
          conversionStatus: 'converted'
        }
      })
    } else {
      // Mark as failed
      await payload.update({
        collection: 'media',
        id: mediaId,
        data: {
          conversionStatus: 'failed',
        },
      })

      return NextResponse.json(
        { error: 'Failed to convert Live Photo' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error in Live Photo conversion API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to list failed Live Photo conversions
export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get user from session
    const { user } = await payload.auth({ headers: req.headers })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Find all failed Live Photo conversions
    const failedConversions = await payload.find({
      collection: 'media',
      where: {
        and: [
          {
            mimeType: { in: ['image/heic', 'image/heif'] }
          },
          {
            conversionStatus: { equals: 'failed' }
          }
        ]
      },
      limit: 50,
    })

    return NextResponse.json({
      success: true,
      data: {
        failedConversions: failedConversions.docs,
        total: failedConversions.totalDocs
      }
    })

  } catch (error) {
    console.error('❌ Error fetching failed conversions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 