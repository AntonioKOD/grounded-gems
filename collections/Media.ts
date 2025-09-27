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

// Enhanced video thumbnail generation with storage detection
const handleVideoThumbnailGeneration = async (doc: any, req: any) => {
  try {
    console.log('🎬 Starting enhanced video thumbnail generation:', doc.filename)
    console.log('🎬 Video document details:', {
      id: doc.id,
      filename: doc.filename,
      mimeType: doc.mimeType,
      type: doc.type,
      url: doc.url,
      hasThumbnail: !!doc.thumbnailUrl
    })
    
    // Small delay to ensure file is fully written
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Generate thumbnail using the enhanced system
    const { generateVideoThumbnailEnhanced } = await import('@/lib/video-thumbnail-generator')
    const thumbnailUrl = await generateVideoThumbnailEnhanced(doc, req.payload)
    
    if (thumbnailUrl) {
      console.log('🎬 Video thumbnail created successfully:', thumbnailUrl)
      
      // Update the video document with the thumbnail URL
      try {
        await req.payload.update({
          collection: 'media',
          id: doc.id,
          data: {
            thumbnailUrl: thumbnailUrl,
          },
        })
        console.log('🎬 Video document updated with thumbnail URL')
      } catch (updateError) {
        console.error('🎬 Error updating video document with thumbnail URL:', updateError)
      }
    } else {
      console.log('🎬 Video thumbnail creation failed')
      
      // Create a placeholder thumbnail if generation fails
      try {
        const placeholderUrl = await createPlaceholderThumbnailEnhanced(doc, req.payload)
        if (placeholderUrl) {
          console.log('🎬 Placeholder thumbnail created:', placeholderUrl)
          await req.payload.update({
            collection: 'media',
            id: doc.id,
            data: {
              thumbnailUrl: placeholderUrl,
            },
          })
        }
      } catch (placeholderError) {
        console.error('🎬 Error creating placeholder thumbnail:', placeholderError)
      }
    }
    
  } catch (error) {
    console.error('🎬 Error in enhanced video processing:', error)
    
    // Try to create a placeholder thumbnail as fallback
    try {
      const placeholderUrl = await createPlaceholderThumbnailEnhanced(doc, req.payload)
      if (placeholderUrl) {
        console.log('🎬 Fallback placeholder thumbnail created:', placeholderUrl)
        await req.payload.update({
          collection: 'media',
          id: doc.id,
          data: {
            thumbnailUrl: placeholderUrl,
          },
        })
      }
    } catch (fallbackError) {
      console.error('🎬 Error creating fallback placeholder thumbnail:', fallbackError)
    }
  }
}

// Enhanced placeholder thumbnail creation with storage detection
const createPlaceholderThumbnailEnhanced = async (doc: any, payload: any): Promise<string | null> => {
  try {
    console.log('🎬 Creating enhanced placeholder thumbnail for video:', doc.filename)
    
    // Create a simple placeholder image
    const canvas = require('canvas')
    const { createCanvas } = canvas
    
    const width = 400
    const height = 300
    const canvasInstance = createCanvas(width, height)
    const ctx = canvasInstance.getContext('2d')
    
    // Draw a gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#667eea')
    gradient.addColorStop(1, '#764ba2')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    
    // Draw a play button
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, 40, 0, 2 * Math.PI)
    ctx.fill()
    
    ctx.fillStyle = '#667eea'
    ctx.beginPath()
    ctx.moveTo(width / 2 + 10, height / 2 - 15)
    ctx.lineTo(width / 2 + 10, height / 2 + 15)
    ctx.lineTo(width / 2 + 25, height / 2)
    ctx.closePath()
    ctx.fill()
    
    // Add text
    ctx.fillStyle = 'white'
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Video', width / 2, height - 30)
    
    const buffer = canvasInstance.toBuffer('image/jpeg')
    const thumbnailFilename = `placeholder_${doc.filename?.replace(/\.[^/.]+$/, '') || 'video'}_${Date.now()}.jpg`
    
    // Detect storage type and handle accordingly
    const isUsingVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN
    
    if (isUsingVercelBlob) {
      // For Vercel Blob storage, create a media document and return its URL
      const thumbnailDoc = await payload.create({
        collection: 'media',
        data: {
          alt: `Placeholder thumbnail for ${doc.alt || doc.filename || 'video'}`,
          uploadedBy: doc.uploadedBy,
          uploadSource: 'system',
          folder: 'thumbnails',
          type: 'image',
        },
        file: {
          data: buffer,
          mimetype: 'image/jpeg',
          name: thumbnailFilename,
          size: buffer.length,
        },
      })
      
      console.log('🎬 Placeholder thumbnail created in Vercel Blob:', thumbnailDoc.id)
      return thumbnailDoc.url || `/api/media/file/${thumbnailFilename}`
    } else {
      // For local storage, save to public directory and return URL
      const thumbDir = path.join(process.cwd(), 'public', 'thumbnails')
      fs.mkdirSync(thumbDir, { recursive: true })
      const finalPath = path.join(thumbDir, thumbnailFilename)
      fs.writeFileSync(finalPath, buffer)
      
      const thumbnailUrl = `/thumbnails/${thumbnailFilename}`
      console.log('🎬 Placeholder thumbnail saved locally:', thumbnailUrl)
      return thumbnailUrl
    }
    
  } catch (error) {
    console.error('🎬 Error creating enhanced placeholder thumbnail:', error)
    return null
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
      name: 'type',
      type: 'select',
      options: [
        { label: 'Image', value: 'image' },
        { label: 'Video', value: 'video' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Media type (auto-detected)',
        readOnly: true,
      },
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
        { label: 'System', value: 'system' },
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
      name: 'width',
      type: 'number',
      admin: {
        description: 'Media width in pixels',
        readOnly: true,
      },
    },
    {
      name: 'height',
      type: 'number',
      admin: {
        description: 'Media height in pixels',
        readOnly: true,
      },
    },
    {
      name: 'durationSec',
      type: 'number',
      admin: {
        description: 'Video duration in seconds (for videos only)',
        readOnly: true,
      },
    },
    {
      name: 'thumbnailUrl',
      type: 'text',
      admin: {
        description: 'Direct URL to video thumbnail (JPEG) - auto-generated for videos',
        readOnly: true,
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
      name: 'isBlobUrl',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Indicates if the URL is already a blob storage URL',
        readOnly: true,
      },
    },
    {
      name: 'videoThumbnail',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Auto-generated thumbnail for video files (legacy field)',
        readOnly: true,
      },
    },
    {
      name: 'isVideo',
      type: 'checkbox',
      admin: {
        description: 'Indicates if this is a video file (legacy field)',
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        console.log('🎬 Media beforeChange:', {
          operation,
          mimeType: data.mimeType,
          filename: data.filename,
          type: data.type
        })
        
        // Set media type based on MIME type
        if (operation === 'create') {
          if (data.mimeType?.startsWith('video/')) {
            console.log('🎬 Media beforeChange: Setting type to video:', data.filename)
            data.type = 'video'
            data.isVideo = true // Keep legacy field for backward compatibility
          } else if (data.mimeType?.startsWith('image/')) {
            console.log('🎬 Media beforeChange: Setting type to image:', data.filename)
            data.type = 'image'
            data.isVideo = false // Keep legacy field for backward compatibility
          }
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

        // Ensure blob storage URLs are used for all media (skip if already a blob URL)
        if (operation === 'create' && process.env.BLOB_READ_WRITE_TOKEN && doc.url && !doc.isBlobUrl) {
          try {
            // Check if URL is already a blob storage URL
            if (!doc.url.includes('blob.vercel-storage.com')) {
              console.log('🔄 Converting media URL to blob storage URL:', {
                originalUrl: doc.url,
                filename: doc.filename
              })
              
              // Validate BLOB_READ_WRITE_TOKEN format
              if (!process.env.BLOB_READ_WRITE_TOKEN.startsWith('vercel_blob_rw_')) {
                console.warn('⚠️ Invalid BLOB_READ_WRITE_TOKEN format, skipping blob URL conversion')
                return
              }
              
              // Construct blob storage URL
              const blobHostname = process.env.BLOB_READ_WRITE_TOKEN.replace('vercel_blob_rw_', '')
              const blobUrl = `https://${blobHostname}.public.blob.vercel-storage.com/${doc.filename}`
              
              // Check if document still exists before updating
              try {
                const existingDoc = await req.payload.findByID({
                  collection: 'media',
                  id: doc.id
                })
                
                if (existingDoc) {
                  // Update the document with blob URL
                  await req.payload.update({
                    collection: 'media',
                    id: doc.id,
                    data: {
                      url: blobUrl
                    }
                  })
                  
                  console.log('✅ Updated media URL to blob storage:', blobUrl)
                } else {
                  console.log('⚠️ Media document not found, skipping blob URL update:', doc.id)
                }
              } catch (updateError) {
                console.error('❌ Error checking/updating media document:', updateError)
                // Don't throw the error, just log it and continue
              }
            }
          } catch (error) {
            console.error('❌ Failed to update media URL to blob storage:', error)
          }
        } else if (doc.isBlobUrl) {
          console.log('🔄 Skipping blob URL conversion - already a blob URL:', doc.url)
        }
        
        // Handle Live Photo conversion to JPEG
        if (operation === 'create' && (doc.mimeType === 'image/heic' || doc.mimeType === 'image/heif')) {
          await handleLivePhotoConversionAsync(doc, req)
        }
        
        // Process videos on create that don't already have a thumbnail
        if (operation === 'create' && doc.type === 'video' && !doc.thumbnailUrl) {
          console.log('🎬 Media afterChange: Processing video for thumbnail generation')
          await handleVideoThumbnailGeneration(doc, req)
        } else {
          console.log('🎬 Media afterChange: Skipping thumbnail generation:', {
            reason: operation !== 'create' ? 'not create operation' : 
                   doc.type !== 'video' ? 'not a video' : 
                   doc.thumbnailUrl ? 'already has thumbnail' : 'unknown'
          })
        }
        
        // Broadcast real-time events for media changes
        try {
          const { broadcastMessage } = await import('@/lib/wsServer');
          const { createBaseMessage, RealTimeEventType } = await import('@/lib/realtimeEvents');
          
          if (operation === 'create') {
            // Broadcast new media creation
            const newMediaMessage: any = {
              messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              timestamp: new Date().toISOString(),
              eventType: RealTimeEventType.MEDIA_CREATED,
              data: {
                media: {
                  id: doc.id,
                  filename: doc.filename,
                  mimeType: doc.mimeType,
                  url: doc.url,
                  isVideo: doc.isVideo,
                  width: doc.width,
                  height: doc.height,
                  createdAt: doc.createdAt
                }
              }
            };

            broadcastMessage(newMediaMessage, {
              queueForOffline: true
            });

            console.log(`📡 [Media] Real-time event broadcasted: MEDIA_CREATED for media ${doc.id}`);
          }

          if (operation === 'update') {
            // Check if media processing status changed
            const processingChanged = 
              doc.conversionStatus !== doc.conversionStatus ||
              doc.videoThumbnail !== doc.videoThumbnail;

            if (processingChanged) {
              const processingUpdateMessage: any = {
                messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                timestamp: new Date().toISOString(),
                eventType: RealTimeEventType.MEDIA_UPDATED,
                data: {
                  mediaId: doc.id,
                  updates: {
                    conversionStatus: doc.conversionStatus,
                    hasVideoThumbnail: !!doc.videoThumbnail,
                    videoThumbnail: doc.videoThumbnail?.url,
                    lastUpdated: new Date().toISOString()
                  }
                }
              };

              broadcastMessage(processingUpdateMessage, {
                queueForOffline: true
              });

              console.log(`📡 [Media] Real-time event broadcasted: MEDIA_PROCESSING_UPDATED for media ${doc.id}`);
            }
          }

        } catch (realtimeError) {
          console.warn('Failed to broadcast real-time events for media:', realtimeError);
        }

        return doc
      },
    ],
    afterDelete: [
      async ({ req, doc, id }) => {
        if (!req.payload) return;

        try {
          const { broadcastMessage } = await import('@/lib/wsServer');
          const { createBaseMessage, RealTimeEventType } = await import('@/lib/realtimeEvents');
          
          const mediaDeletedMessage: any = {
            messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            timestamp: new Date().toISOString(),
            eventType: RealTimeEventType.MEDIA_DELETED,
            data: {
              mediaId: id,
              removeFromFeeds: true,
              cleanupRequired: true
            }
          };

          broadcastMessage(mediaDeletedMessage, {
            queueForOffline: true
          });

          console.log(`📡 [Media] Real-time event broadcasted: MEDIA_DELETED for media ${id}`);
        } catch (realtimeError) {
          console.warn('Failed to broadcast real-time event for media deletion:', realtimeError);
        }
      }
    ]
  },
}
