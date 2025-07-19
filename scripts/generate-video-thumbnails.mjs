#!/usr/bin/env node

import { getPayload } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function generateVideoThumbnails() {
  try {
    console.log('🎬 Starting video thumbnail generation...')
    
    // Initialize payload with the config
    const payload = await getPayload({
      config: path.resolve(__dirname, '../payload.config.ts')
    })

    // Find all videos without thumbnails
    const videosWithoutThumbnails = await payload.find({
      collection: 'media',
      where: {
        and: [
          {
            isVideo: {
              equals: true
            }
          },
          {
            or: [
              {
                videoThumbnail: {
                  exists: false
                }
              },
              {
                videoThumbnail: {
                  equals: null
                }
              }
            ]
          }
        ]
      },
      limit: 1000
    })

    console.log(`🎬 Found ${videosWithoutThumbnails.docs.length} videos without thumbnails`)

    if (videosWithoutThumbnails.docs.length === 0) {
      console.log('🎬 All videos already have thumbnails!')
      return
    }

    // Generate thumbnails for each video
    for (const video of videosWithoutThumbnails.docs) {
      try {
        console.log(`🎬 Processing video: ${video.filename} (${video.id})`)
        
        // Call the thumbnail generation API
        const response = await fetch('http://localhost:3000/api/media/generate-video-thumbnail', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoId: video.id }),
        })

        const result = await response.json()

        if (result.success) {
          console.log(`✅ Thumbnail generated for ${video.filename}: ${result.thumbnailId}`)
        } else {
          console.log(`❌ Failed to generate thumbnail for ${video.filename}: ${result.error}`)
        }

        // Add a small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ Error processing video ${video.filename}:`, error.message)
      }
    }

    console.log('🎬 Video thumbnail generation completed!')

  } catch (error) {
    console.error('🎬 Error in video thumbnail generation:', error)
  }
}

// Run the script
generateVideoThumbnails()
  .then(() => {
    console.log('🎬 Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('🎬 Script failed:', error)
    process.exit(1)
  }) 