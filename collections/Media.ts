import type { CollectionConfig } from 'payload'
import path from 'path'
import fs from 'fs'

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
      
      // Mobile-specific formats (iOS/Android)
      'image/heic',
      'image/heif',
      'image/heic-sequence',
      'image/heif-sequence',
      
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
          docId: doc.id
        })
        
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
