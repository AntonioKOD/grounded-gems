import type { CollectionConfig } from 'payload'
import path from 'path'
import fs from 'fs'

// Helper function to safely load Sharp
const loadSharp = async () => {
  try {
    // Try to load Sharp dynamically
    const sharp = await import('sharp')
    return sharp.default
  } catch (error) {
    console.error('❌ Failed to load Sharp library:', error)
    return null
  }
}

// Helper function to convert HEIC to JPEG with fallback
const convertHeicToJpeg = async (filePath: string, outputPath: string) => {
  try {
    const sharp = await loadSharp()
    if (!sharp) {
      console.log('⚠️ Sharp not available, keeping original HEIC file')
      return false
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('⚠️ Original file not found for conversion:', filePath)
      return false
    }

    // Convert HEIC to JPEG
    await sharp(filePath)
      .jpeg({ quality: 90 })
      .toFile(outputPath)

    console.log('✅ HEIC converted to JPEG successfully')
    return true
  } catch (error) {
    console.error('❌ Error converting HEIC to JPEG:', error)
    return false
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
          try {
            console.log('📱 Converting Live Photo to JPEG:', doc.filename)
            
            // Add a small delay to ensure the file is fully saved
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            const filePath = path.join(process.cwd(), 'media', doc.filename)
            const outputPath = filePath.replace(/\.(heic|heif)$/i, '.jpg')
            
            // Attempt conversion
            const conversionSuccess = await convertHeicToJpeg(filePath, outputPath)
            
            if (conversionSuccess) {
              // Update the document with new filename and MIME type
              const newFilename = path.basename(outputPath)
              
              try {
                await req.payload.update({
                  collection: 'media',
                  id: doc.id,
                  data: {
                    filename: newFilename,
                    mimeType: 'image/jpeg',
                    conversionStatus: 'converted',
                  },
                })
                
                // Remove the original HEIC/HEIF file
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath)
                  console.log('📱 Original HEIC file removed')
                }
                
                console.log('📱 Live Photo converted successfully to JPEG:', newFilename)
              } catch (updateError) {
                console.error('❌ Error updating document after conversion:', updateError)
                // Mark as failed but keep the original
                await req.payload.update({
                  collection: 'media',
                  id: doc.id,
                  data: {
                    conversionStatus: 'failed',
                  },
                })
              }
            } else {
              // Conversion failed, mark as failed but keep the original
              console.log('⚠️ Live Photo conversion failed, keeping original HEIC file')
              await req.payload.update({
                collection: 'media',
                id: doc.id,
                data: {
                  conversionStatus: 'failed',
                },
              })
            }
            
          } catch (error) {
            console.error('📱 Error in Live Photo processing:', error)
            // Mark as failed
            try {
              await req.payload.update({
                collection: 'media',
                id: doc.id,
                data: {
                  conversionStatus: 'failed',
                },
              })
            } catch (updateError) {
              console.error('❌ Error updating conversion status:', updateError)
            }
          }
        }
        
        // Only process videos on create that don't already have a thumbnail
        if (operation === 'create' && doc.isVideo && !doc.videoThumbnail) {
          try {
            console.log('🎬 Processing video for thumbnail generation:', doc.filename)
            
            // Add a small delay to ensure the document is fully saved
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Generate thumbnail
            try {
              console.log('🎬 Importing video thumbnail generator...')
              const { generateVideoThumbnailManually } = await import('@/lib/video-thumbnail-generator')
              console.log('🎬 Calling generateVideoThumbnailManually...')
              const thumbnailId = await generateVideoThumbnailManually(doc, req.payload)
              
              if (thumbnailId) {
                console.log('🎬 Video thumbnail created successfully:', thumbnailId)
              } else {
                console.log('🎬 Video thumbnail creation failed')
              }
            } catch (thumbnailError) {
              console.error('🎬 Error in thumbnail generation:', thumbnailError)
            }
            
          } catch (error) {
            console.error('🎬 Error in video processing:', error)
          }
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
