import type { CollectionConfig } from 'payload'
import path from 'path'
import fs from 'fs'

// Queue for Live Photo conversions to prevent conflicts
const conversionQueue: Array<{
  id: string
  filePath: string
  outputPath: string
  resolve: (value: boolean) => void
  reject: (error: Error) => void
}> = []

let isProcessingQueue = false

// Process conversion queue sequentially
const processConversionQueue = async () => {
  if (isProcessingQueue || conversionQueue.length === 0) return
  
  isProcessingQueue = true
  
  while (conversionQueue.length > 0) {
    const task = conversionQueue.shift()
    if (!task) continue
    
    try {
      const result = await convertHeicToJpeg(task.filePath, task.outputPath)
      task.resolve(result)
    } catch (error) {
      task.reject(error as Error)
    }
    
    // Reduced delay between conversions for faster processing
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  isProcessingQueue = false
}

// Enhanced helper function to safely load Sharp with better error handling
const loadSharp = async () => {
  try {
    // Check if we're in a production environment
    const isProduction = process.env.NODE_ENV === 'production'
    
    // Try to load Sharp dynamically
    const sharp = await import('sharp')
    return sharp.default
  } catch (error) {
    console.error('❌ Failed to load Sharp library:', error)
    
    // In production, try alternative approaches
    if (process.env.NODE_ENV === 'production') {
      try {
        // Try requiring Sharp directly
        const sharp = require('sharp')
        return sharp
      } catch (requireError) {
        console.error('❌ Sharp require() also failed:', requireError)
      }
      
      try {
        // Try with explicit path
        const sharp = await import(process.cwd() + '/node_modules/sharp')
        return sharp.default
      } catch (pathError) {
        console.error('❌ Sharp explicit path also failed:', pathError)
      }
    }
    
    return null
  }
}

// Enhanced helper function to convert HEIC to JPEG with better error handling
const convertHeicToJpeg = async (filePath: string, outputPath: string) => {
  try {
    // Check if input file exists and is readable
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Input file does not exist: ${filePath}`)
      return false
    }
    
    const stats = fs.statSync(filePath)
    if (stats.size === 0) {
      console.error(`❌ Input file is empty: ${filePath}`)
      return false
    }
    
    // Check if output directory exists and is writable
    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    // Test write permissions
    try {
      const testFile = path.join(outputDir, '.test-write')
      fs.writeFileSync(testFile, 'test')
      fs.unlinkSync(testFile)
    } catch (writeError) {
      console.error(`❌ Output directory not writable: ${outputDir}`, writeError)
      return false
    }
    
    const sharp = await loadSharp()
    if (!sharp) {
      console.log('⚠️ Sharp not available, keeping original HEIC file')
      return false
    }

    // Convert HEIC to JPEG with error handling
    await sharp(filePath)
      .jpeg({ 
        quality: 90,
        progressive: true,
        force: true
      })
      .toFile(outputPath)

    // Verify the output file was created
    if (!fs.existsSync(outputPath)) {
      console.error('❌ Output file was not created')
      return false
    }
    
    const outputStats = fs.statSync(outputPath)
    if (outputStats.size === 0) {
      console.error('❌ Output file is empty')
      return false
    }
    
    console.log(`✅ HEIC converted to JPEG successfully: ${outputStats.size} bytes`)
    return true
  } catch (error) {
    console.error('❌ Error converting HEIC to JPEG:', error)
    return false
  }
}

// Helper function to queue conversion with unique file handling
const queueConversion = async (filePath: string, outputPath: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    // Add task to queue
    conversionQueue.push({
      id: path.basename(filePath),
      filePath,
      outputPath,
      resolve,
      reject
    })
    
    // Start processing if not already running
    processConversionQueue()
  })
}

// Helper function to generate unique filename
const generateUniqueFilename = (originalPath: string, baseDir: string): string => {
  const ext = path.extname(originalPath)
  const baseName = path.basename(originalPath, ext)
  let counter = 1
  let newPath = path.join(baseDir, `${baseName}${ext}`)
  
  // Keep trying until we find a unique filename
  while (fs.existsSync(newPath)) {
    newPath = path.join(baseDir, `${baseName}_${counter}${ext}`)
    counter++
  }
  
  return newPath
}

// Optimized helper function to safely update media document with faster retry
const safeUpdateMediaDoc = async (req: any, docId: string, updateData: any, maxRetries: number = 2) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await req.payload.update({
        collection: 'media',
        id: docId,
        data: updateData,
      })
      return true
    } catch (error) {
      // Check if it's a WriteConflict error
      const isWriteConflict = error instanceof Error && 
        (error.message.includes('WriteConflict') || 
         error.message.includes('code: 112') ||
         error.message.includes('Please retry your operation'))
      
      if (isWriteConflict && attempt < maxRetries) {
        // Faster retry with shorter delays
        const delay = 200 * Math.pow(2, attempt - 1) + Math.random() * 300
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // For non-retryable errors or max retries reached, return false
      return false
    }
  }
  
  return false
}

// Async function to handle Live Photo conversion without blocking the upload
const handleLivePhotoConversionAsync = async (doc: any, req: any) => {
  try {
    console.log('📱 Starting async Live Photo conversion:', doc.filename)
    
    // Reduced delay for faster processing
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const mediaDir = path.join(process.cwd(), 'media')
    const filePath = path.join(mediaDir, doc.filename)
    
    // Check if media directory exists
    if (!fs.existsSync(mediaDir)) {
      console.error(`❌ Media directory does not exist: ${mediaDir}`)
      await safeUpdateMediaDoc(req, doc.id, { conversionStatus: 'failed' })
      return
    }
    
    // Generate unique output path to prevent conflicts
    const baseName = path.basename(doc.filename, path.extname(doc.filename))
    const timestamp = Date.now()
    const uniqueOutputPath = path.join(mediaDir, `${baseName}_${timestamp}.jpg`)
    
    // Queue the conversion to prevent conflicts with multiple uploads
    const conversionSuccess = await queueConversion(filePath, uniqueOutputPath)
    
    if (conversionSuccess) {
      // Update the document with new filename and MIME type
      const newFilename = path.basename(uniqueOutputPath)
      
      const updateSuccess = await safeUpdateMediaDoc(req, doc.id, {
        filename: newFilename,
        mimeType: 'image/jpeg',
        conversionStatus: 'converted',
      })
      
      if (updateSuccess) {
        // Remove the original HEIC/HEIF file
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }
        } catch (unlinkError) {
          console.error('❌ Error removing original file:', unlinkError)
        }
        
        console.log('📱 Live Photo converted successfully to JPEG:', newFilename)
      }
    } else {
      // Conversion failed, mark as failed but keep the original
      await safeUpdateMediaDoc(req, doc.id, { conversionStatus: 'failed' })
    }
    
  } catch (error) {
    console.error('📱 Error in async Live Photo processing:', error)
    await safeUpdateMediaDoc(req, doc.id, { conversionStatus: 'failed' })
  }
}

// Async function to handle video thumbnail generation without blocking the upload
const handleVideoThumbnailAsync = async (doc: any, req: any) => {
  try {
    console.log('🎬 Starting async video thumbnail generation:', doc.filename)
    
    // Reduced delay for faster processing
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Generate thumbnail
    const { generateVideoThumbnailManually } = await import('@/lib/video-thumbnail-generator')
    const thumbnailId = await generateVideoThumbnailManually(doc, req.payload)
    
    if (thumbnailId) {
      console.log('🎬 Video thumbnail created successfully:', thumbnailId)
    } else {
      console.log('🎬 Video thumbnail creation failed')
    }
    
  } catch (error) {
    console.error('🎬 Error in async video processing:', error)
  }
}

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: () => true,
  },
  upload: {
    staticDir: 'media',
    mimeTypes: [
      // Standard image formats
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/avif',
      'image/jfif',
      'image/pjpeg',
      'image/pjp',
      
      // Mobile-specific formats (iOS/Android) - Live Photos
      'image/heic',
      'image/heif',
      'image/heic-sequence',
      'image/heif-sequence',
      
      // Additional Live Photo formats
      'image/heic-sequence',
      'image/heif-sequence',
      'image/heic-sequence-1',
      'image/heif-sequence-1',
      
      // Additional image formats
      'image/bmp',
      'image/tiff',
      'image/tif',
      'image/ico',
      'image/x-icon',
      'image/vnd.microsoft.icon',
      'image/jp2',
      'image/jpx',
      'image/jpm',
      'image/psd',
      'image/raw',
      'image/x-portable-bitmap',
      'image/x-portable-pixmap',
      'image/x-portable-graymap',
      
      // Video formats
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/mov',
      'video/avi',
      'video/quicktime',
      'video/x-msvideo',
      'video/3gpp',
      'video/3gpp2',
      'video/x-matroska',
      'video/mp2t',
      'video/mpeg',
      'video/mpg',
      'video/mpe',
      'video/mpv',
      'video/m4v',
      'video/3gp',
      'video/3g2',
      'video/ts',
      'video/mts',
      'video/m2ts',
    ],
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'center',
      },
      {
        name: 'card',
        width: 768,
        height: 1024,
        position: 'center',
      },
    ],
    adminThumbnail: 'thumbnail',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'uploadSource',
      type: 'select',
      options: [
        { label: 'Web', value: 'web' },
        { label: 'Mobile', value: 'mobile' },
        { label: 'Admin', value: 'admin' },
      ],
      defaultValue: 'web',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'folder',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'originalFormat',
      type: 'text',
      admin: {
        description: 'Original file format before conversion (e.g., HEIC for Live Photos)',
        readOnly: true,
      },
    },
    {
      name: 'conversionStatus',
      type: 'select',
      options: [
        { label: 'Not Converted', value: 'not_converted' },
        { label: 'Converted Successfully', value: 'converted' },
        { label: 'Conversion Failed', value: 'failed' },
        { label: 'No Conversion Needed', value: 'not_needed' },
      ],
      defaultValue: 'not_needed',
      admin: {
        description: 'Status of Live Photo conversion',
        readOnly: true,
      },
    },
    {
      name: 'videoThumbnail',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Auto-generated thumbnail for video files',
        readOnly: true,
      },
    },
    {
      name: 'isVideo',
      type: 'checkbox',
      admin: {
        description: 'Indicates if this is a video file',
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // Mark videos as isVideo during creation
        if (operation === 'create' && data.mimeType?.startsWith('video/')) {
          console.log('🎬 Media beforeChange: Marking as video:', data.filename)
          data.isVideo = true
        }
        
        // Store original format for Live Photos
        if (operation === 'create' && (data.mimeType === 'image/heic' || data.mimeType === 'image/heif')) {
          console.log('📱 Media beforeChange: Live Photo detected:', data.filename)
          data.originalFormat = data.mimeType
          data.conversionStatus = 'not_converted'
        }
        
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        console.log('🎬 Media afterChange hook triggered:', {
          operation,
          mimeType: doc.mimeType,
          filename: doc.filename,
          isVideo: doc.isVideo,
          hasThumbnail: !!doc.videoThumbnail,
          docId: doc.id,
          originalFormat: doc.originalFormat,
          conversionStatus: doc.conversionStatus
        })
        
        // Handle Live Photo conversion to JPEG
        if (operation === 'create' && (doc.mimeType === 'image/heic' || doc.mimeType === 'image/heif')) {
          await handleLivePhotoConversionAsync(doc, req)
        }
        
        // Only process videos on create that don't already have a thumbnail
        if (operation === 'create' && doc.isVideo && !doc.videoThumbnail) {
          await handleVideoThumbnailAsync(doc, req)
        } else {
          console.log('🎬 Skipping thumbnail generation:', {
            reason: operation !== 'create' ? 'not create operation' : 
                   !doc.isVideo ? 'not a video' : 
                   doc.videoThumbnail ? 'already has thumbnail' : 'unknown'
          })
        }
        
        return doc
      },
    ],
  },
}
