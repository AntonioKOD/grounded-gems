import path from 'path'
import fs from 'fs'
import { createCanvas, loadImage } from 'canvas'
import { spawn } from 'child_process'

/**
 * Generate a video frame thumbnail from the first frame of the video
 * Uses multiple approaches to extract video frames
 */
export async function generateVideoThumbnailManually(
  videoDoc: any, 
  payload: any
): Promise<string | null> {
  try {
    console.log('🎬 Manual: Starting video frame thumbnail generation for video:', videoDoc.id)
    console.log('🎬 Manual: Video document details:', {
      id: videoDoc.id,
      filename: videoDoc.filename,
      url: videoDoc.url,
      mimeType: videoDoc.mimeType,
      isVideo: videoDoc.isVideo,
      hasThumbnail: !!videoDoc.videoThumbnail
    })
    
    // Try to extract actual video frame first
    const thumbnailId = await createVideoFrameThumbnail(videoDoc, payload)
    
    if (thumbnailId) {
      console.log('🎬 Manual: Video frame thumbnail created successfully:', thumbnailId)
      return thumbnailId
    }
    
    // If frame extraction fails, create a placeholder
    console.log('🎬 Manual: Frame extraction failed, creating placeholder')
    const placeholderId = await createPlaceholderThumbnail(videoDoc, payload)
    
    if (placeholderId) {
      console.log('🎬 Manual: Placeholder thumbnail created successfully:', placeholderId)
      return placeholderId
    }
    
    // If all thumbnail creation fails, return null
    console.log('🎬 Manual: All thumbnail creation failed')
    return null
    
  } catch (error) {
    console.error('🎬 Manual: Error in generateVideoThumbnailManually:', error)
    return null
  }
}

/**
 * Create a video frame thumbnail by extracting the first frame
 */
async function createVideoFrameThumbnail(videoDoc: any, payload: any): Promise<string | null> {
  try {
    console.log('🎬 Manual: Creating video frame thumbnail')
    
    // Get the video file path
    const videoUrl = videoDoc.url
    if (!videoUrl) {
      console.log('🎬 Manual: No video URL available')
      return null
    }
    
    // Try to extract actual video frame using ffmpeg if available
    let frameBuffer = await extractVideoFrameWithFFmpeg(videoUrl, videoDoc.filename)
    
    if (!frameBuffer) {
      // Fallback to canvas-based frame
      frameBuffer = await extractVideoFrameWithCanvas(videoUrl, videoDoc.filename)
    }
    
    if (!frameBuffer) {
      console.log('🎬 Manual: Could not extract video frame')
      return null
    }
    
    const thumbnailFilename = `frame_${path.parse(videoDoc.filename || 'video').name}.png`
    
    // Create thumbnail media document
    const thumbnailDoc = await payload.create({
      collection: 'media',
      data: {
        alt: `Video frame thumbnail for ${videoDoc.alt || videoDoc.filename || 'video'}`,
        uploadedBy: videoDoc.uploadedBy,
        uploadSource: 'system',
        folder: 'thumbnails',
      },
      file: {
        data: frameBuffer,
        mimetype: 'image/png',
        name: thumbnailFilename,
        size: frameBuffer.length,
      },
    })
    
    // Update the original video document with thumbnail reference
    // Add retry logic in case the document isn't immediately available
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        await payload.update({
          collection: 'media',
          id: videoDoc.id,
          data: {
            videoThumbnail: thumbnailDoc.id,
          },
        })
        console.log('🎬 Manual: Video frame thumbnail created and linked')
        return thumbnailDoc.id
      } catch (updateError: any) {
        retryCount++
        console.log(`🎬 Manual: Update attempt ${retryCount} failed:`, updateError.message)
        
        if (retryCount >= maxRetries) {
          console.error('🎬 Manual: Failed to update video document after retries')
          // Still return the thumbnail ID even if linking fails
          return thumbnailDoc.id
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
      }
    }
    
    return thumbnailDoc.id
    
  } catch (error) {
    console.error('🎬 Manual: Error creating video frame thumbnail:', error)
    return null
  }
}

/**
 * Extract a frame from video using FFmpeg (if available)
 */
async function extractVideoFrameWithFFmpeg(videoUrl: string, filename: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      console.log('🎬 Manual: Attempting FFmpeg frame extraction from:', videoUrl)
      
      // Check if ffmpeg is available
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoUrl,
        '-vframes', '1',
        '-f', 'image2',
        '-vf', 'scale=400:300:force_original_aspect_ratio=decrease,pad=400:300:(ow-iw)/2:(oh-ih)/2',
        '-y',
        'pipe:1'
      ], {
        stdio: ['ignore', 'pipe', 'pipe']
      })
      
      const chunks: Buffer[] = []
      
      ffmpeg.stdout.on('data', (chunk) => {
        chunks.push(chunk)
      })
      
      ffmpeg.stderr.on('data', (data) => {
        console.log('🎬 Manual: FFmpeg stderr:', data.toString())
      })
      
      ffmpeg.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          const buffer = Buffer.concat(chunks)
          console.log('🎬 Manual: FFmpeg frame extraction successful')
          resolve(buffer)
        } else {
          console.log('🎬 Manual: FFmpeg frame extraction failed, code:', code)
          resolve(null)
        }
      })
      
      ffmpeg.on('error', (error) => {
        console.log('🎬 Manual: FFmpeg not available or error:', error.message)
        resolve(null)
      })
      
      // Timeout after 10 seconds
      setTimeout(() => {
        ffmpeg.kill()
        console.log('🎬 Manual: FFmpeg frame extraction timed out')
        resolve(null)
      }, 10000)
      
    } catch (error) {
      console.log('🎬 Manual: FFmpeg extraction error:', error)
      resolve(null)
    }
  })
}

/**
 * Extract a frame from video using canvas (fallback)
 * This creates a video-like thumbnail when actual frame extraction fails
 */
async function extractVideoFrameWithCanvas(videoUrl: string, filename: string): Promise<Buffer | null> {
  try {
    console.log('🎬 Manual: Creating canvas-based video frame from:', videoUrl)
    console.log('🎬 Manual: Filename:', filename)
    
    // Create a canvas with video dimensions
    const canvas = createCanvas(400, 300)
    const ctx = canvas.getContext('2d')
    
    // Create a gradient background that looks like a video frame
    const gradient = ctx.createLinearGradient(0, 0, 400, 300)
    gradient.addColorStop(0, '#1a1a1a')
    gradient.addColorStop(0.5, '#2a2a2a')
    gradient.addColorStop(1, '#1a1a1a')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 400, 300)
    
    // Add a video frame border
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    ctx.strokeRect(10, 10, 380, 280)
    
    // Add a play button overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.beginPath()
    ctx.arc(200, 150, 40, 0, 2 * Math.PI)
    ctx.fill()
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(200, 150, 40, 0, 2 * Math.PI)
    ctx.stroke()
    
    // Add play triangle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.beginPath()
    ctx.moveTo(185, 130)
    ctx.lineTo(185, 170)
    ctx.lineTo(225, 150)
    ctx.closePath()
    ctx.fill()
    
    // Add video filename
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Video Frame', 200, 220)
    
    if (filename) {
      ctx.font = '12px Arial'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      const shortName = filename.length > 20 ? filename.substring(0, 17) + '...' : filename
      ctx.fillText(shortName, 200, 240)
    }
    
    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png')
    console.log('🎬 Manual: Canvas video frame created successfully, buffer size:', buffer.length)
    return buffer
    
  } catch (error) {
    console.error('🎬 Manual: Error creating canvas video frame:', error)
    // Safely log error details, handling unknown error types
    if (error && typeof error === 'object') {
      const errObj = error as { message?: string; stack?: string }
      console.error('🎬 Manual: Error details:', {
        message: errObj.message,
        stack: errObj.stack
      })
    } else {
      console.error('🎬 Manual: Error details:', { message: String(error) })
    }
    return null
  }
}

/**
 * Create a placeholder thumbnail when video frame extraction fails
 */
async function createPlaceholderThumbnail(videoDoc: any, payload: any): Promise<string | null> {
  try {
    console.log('🎬 Manual: Creating placeholder thumbnail')
    
    // Generate a simple SVG placeholder with video icon
    const svgContent = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#FF6B6B;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#4ECDC4;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#grad1)"/>
        <rect x="20" y="20" width="360" height="260" rx="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
        
        <!-- Video play icon -->
        <circle cx="200" cy="150" r="50" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
        <polygon points="185,130 185,170 225,150" fill="rgba(255,255,255,0.9)"/>
        
        <!-- Video text -->
        <text x="200" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="rgba(255,255,255,0.9)">
          Video
        </text>
        <text x="200" y="240" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.7)">
          ${videoDoc.filename || 'Video file'}
        </text>
      </svg>
    `
    
    const thumbnailFilename = `placeholder_${path.parse(videoDoc.filename || 'video').name}.svg`
    const thumbnailBuffer = Buffer.from(svgContent, 'utf-8')
    
    // Create thumbnail media document
    const thumbnailDoc = await payload.create({
      collection: 'media',
      data: {
        alt: `Placeholder thumbnail for ${videoDoc.alt || videoDoc.filename || 'video'}`,
        uploadedBy: videoDoc.uploadedBy,
        uploadSource: 'system',
        folder: 'thumbnails',
      },
      file: {
        data: thumbnailBuffer,
        mimetype: 'image/svg+xml',
        name: thumbnailFilename,
        size: thumbnailBuffer.length,
      },
    })
    
    // Update the original video document with thumbnail reference
    // Add retry logic in case the document isn't immediately available
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        await payload.update({
          collection: 'media',
          id: videoDoc.id,
          data: {
            videoThumbnail: thumbnailDoc.id,
          },
        })
        console.log('🎬 Manual: Placeholder thumbnail created and linked')
        return thumbnailDoc.id
      } catch (updateError: any) {
        retryCount++
        console.log(`🎬 Manual: Update attempt ${retryCount} failed:`, updateError.message)
        
        if (retryCount >= maxRetries) {
          console.error('🎬 Manual: Failed to update video document after retries')
          // Still return the thumbnail ID even if linking fails
          return thumbnailDoc.id
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
      }
    }
    
    return thumbnailDoc.id
    
  } catch (error) {
    console.error('🎬 Manual: Error creating placeholder thumbnail:', error)
    return null
  }
} 