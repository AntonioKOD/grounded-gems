import path from 'path'
import fs from 'fs'
import os from 'os'
import { createCanvas, loadImage } from 'canvas'
import { spawn } from 'child_process'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import mime from 'mime'

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic as string)

/**
 * Utility function to create absolute URL from relative path
 */
function absoluteUrl(relativePath: string): string {
  if (/^https?:\/\//i.test(relativePath)) {
    return relativePath
  }
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.SERVER_URL || 'http://localhost:3000'
  return new URL(relativePath, base).toString()
}

/**
 * Utility function to stream a response to a file
 */
async function streamToFile(stream: ReadableStream, filePath: string): Promise<void> {
  const file = fs.createWriteStream(filePath)
  const reader = stream.getReader()
  
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      file.write(Buffer.from(value))
    }
  } finally {
    file.end()
    await new Promise((resolve) => file.on('close', () => resolve(undefined)))
  }
}

/**
 * Enhanced video thumbnail generation with storage detection
 */
export async function generateVideoThumbnailEnhanced(
  videoDoc: any, 
  payload: any
): Promise<string | null> {
  try {
    console.log('🎬 Enhanced: Starting video thumbnail generation for:', videoDoc.id)
    console.log('🎬 Enhanced: Video details:', {
      id: videoDoc.id,
      filename: videoDoc.filename,
      url: videoDoc.url,
      mimeType: videoDoc.mimeType,
      type: videoDoc.type
    })
    
    // Check if this is a video and doesn't already have a thumbnail
    if (videoDoc.type !== 'video' || videoDoc.thumbnailUrl) {
      console.log('🎬 Enhanced: Skipping - not a video or already has thumbnail')
      return null
    }
    
    // Detect storage type
    const isUsingVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN
    console.log('🎬 Enhanced: Storage type:', isUsingVercelBlob ? 'Vercel Blob' : 'Local Disk')
    
    // Get video file path/URL
    const videoUrl = videoDoc.url
    if (!videoUrl) {
      console.log('🎬 Enhanced: No video URL available')
      return null
    }
    
    // Create temporary directory for processing
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-thumb-'))
    const outputPath = path.join(tmpDir, 'thumbnail.jpg')
    
    try {
      // Determine input path based on storage type
      let inputPath: string
      
      if (isUsingVercelBlob || videoUrl.startsWith('http')) {
        // Download remote video to temp file
        inputPath = path.join(tmpDir, 'input.mp4')
        const absoluteVideoUrl = absoluteUrl(videoUrl)
        console.log('🎬 Enhanced: Downloading video from:', absoluteVideoUrl)
        
        const response = await fetch(absoluteVideoUrl)
        if (!response.ok || !response.body) {
          throw new Error(`Failed to download video: ${response.statusText}`)
        }
        
        await streamToFile(response.body, inputPath)
        console.log('🎬 Enhanced: Video downloaded successfully')
      } else {
        // Local file path
        inputPath = path.join(process.cwd(), 'public', videoUrl.replace(/^\//, ''))
        if (!fs.existsSync(inputPath)) {
          console.log('🎬 Enhanced: Local video file not found:', inputPath)
          return null
        }
        console.log('🎬 Enhanced: Using local video file:', inputPath)
      }
      
      // Extract frame using fluent-ffmpeg
      await extractFrameWithFFmpeg(inputPath, outputPath)
      
      if (!fs.existsSync(outputPath)) {
        console.log('🎬 Enhanced: Thumbnail file was not created')
        return null
      }
      
      // Read the generated thumbnail
      const thumbnailBuffer = fs.readFileSync(outputPath)
      console.log('🎬 Enhanced: Thumbnail generated, size:', thumbnailBuffer.length, 'bytes')
      
      // Generate thumbnail filename
      const thumbnailFilename = `thumb_${path.parse(videoDoc.filename || 'video').name}_${Date.now()}.jpg`
      
      let thumbnailUrl: string
      
      if (isUsingVercelBlob) {
        // For Vercel Blob storage, create a media document
        const thumbnailDoc = await payload.create({
          collection: 'media',
          data: {
            alt: `Video thumbnail for ${videoDoc.alt || videoDoc.filename || 'video'}`,
            uploadedBy: videoDoc.uploadedBy,
            uploadSource: 'system',
            folder: 'thumbnails',
            type: 'image',
          },
          file: {
            data: thumbnailBuffer,
            mimetype: 'image/jpeg',
            name: thumbnailFilename,
            size: thumbnailBuffer.length,
          },
        })
        
        thumbnailUrl = thumbnailDoc.url || `/api/media/file/${thumbnailFilename}`
        console.log('🎬 Enhanced: Thumbnail saved to Vercel Blob:', thumbnailUrl)
      } else {
        // For local storage, save to public directory
        const thumbDir = path.join(process.cwd(), 'public', 'thumbnails')
        fs.mkdirSync(thumbDir, { recursive: true })
        const finalPath = path.join(thumbDir, thumbnailFilename)
        fs.writeFileSync(finalPath, thumbnailBuffer)
        
        thumbnailUrl = `/thumbnails/${thumbnailFilename}`
        console.log('🎬 Enhanced: Thumbnail saved locally:', thumbnailUrl)
      }
      
      return thumbnailUrl
      
    } finally {
      // Cleanup temp directory
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      } catch (cleanupError) {
        console.warn('🎬 Enhanced: Failed to cleanup temp directory:', cleanupError)
      }
    }
    
  } catch (error) {
    console.error('🎬 Enhanced: Error generating video thumbnail:', error)
    return null
  }
}

/**
 * Generate a video frame thumbnail from the first frame of the video
 * Uses fluent-ffmpeg for reliable frame extraction
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
    
    // Try to extract actual video frame using fluent-ffmpeg first
    const thumbnailId = await createVideoFrameThumbnailWithFFmpeg(videoDoc, payload)
    
    if (thumbnailId) {
      console.log('🎬 Manual: Video frame thumbnail created successfully:', thumbnailId)
      return thumbnailId
    }
    
    // Fallback to existing method
    const fallbackId = await createVideoFrameThumbnail(videoDoc, payload)
    
    if (fallbackId) {
      console.log('🎬 Manual: Fallback video frame thumbnail created successfully:', fallbackId)
      return fallbackId
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
 * Create a video frame thumbnail using fluent-ffmpeg
 */
async function createVideoFrameThumbnailWithFFmpeg(videoDoc: any, payload: any): Promise<string | null> {
  try {
    console.log('🎬 FFmpeg: Creating video frame thumbnail with fluent-ffmpeg')
    
    // Get the video file path
    const videoUrl = videoDoc.url
    if (!videoUrl) {
      console.log('🎬 FFmpeg: No video URL available')
      return null
    }
    
    // Create temporary directory for processing
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-thumb-'))
    const outputPath = path.join(tmpDir, 'thumbnail.jpg')
    
    // Determine input path (local file or download from URL)
    let inputPath: string
    
    if (videoUrl.startsWith('http')) {
      // Download remote video to temp file
      inputPath = path.join(tmpDir, 'input.mp4')
      await downloadFile(videoUrl, inputPath)
    } else {
      // Local file path
      inputPath = path.join(process.cwd(), 'public', videoUrl.replace(/^\//, ''))
      if (!fs.existsSync(inputPath)) {
        console.log('🎬 FFmpeg: Local video file not found:', inputPath)
        return null
      }
    }
    
    // Extract frame using fluent-ffmpeg
    await extractFrameWithFFmpeg(inputPath, outputPath)
    
    if (!fs.existsSync(outputPath)) {
      console.log('🎬 FFmpeg: Thumbnail file was not created')
      return null
    }
    
    // Read the generated thumbnail
    const thumbnailBuffer = fs.readFileSync(outputPath)
    
    // Create thumbnail filename
    const thumbnailFilename = `thumb_${path.parse(videoDoc.filename || 'video').name}_${Date.now()}.jpg`
    
    // Save thumbnail to public directory
    const thumbDir = path.join(process.cwd(), 'public', 'thumbnails')
    fs.mkdirSync(thumbDir, { recursive: true })
    const finalPath = path.join(thumbDir, thumbnailFilename)
    fs.copyFileSync(outputPath, finalPath)
    
    // Create thumbnail media document
    const thumbnailDoc = await payload.create({
      collection: 'media',
      data: {
        alt: `Video thumbnail for ${videoDoc.alt || videoDoc.filename || 'video'}`,
        uploadedBy: videoDoc.uploadedBy,
        uploadSource: 'system',
        folder: 'thumbnails',
      },
      file: {
        data: thumbnailBuffer,
        mimetype: 'image/jpeg',
        name: thumbnailFilename,
        size: thumbnailBuffer.length,
      },
    })
    
    // Update the original video document with thumbnail reference and URL
    await payload.update({
      collection: 'media',
      id: videoDoc.id,
      data: {
        videoThumbnail: thumbnailDoc.id,
        thumbnailUrl: `/thumbnails/${thumbnailFilename}`,
      },
    })
    
    // Cleanup temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true })
    
    console.log('🎬 FFmpeg: Video frame thumbnail created and linked successfully')
    return thumbnailDoc.id
    
  } catch (error) {
    console.error('🎬 FFmpeg: Error creating video frame thumbnail:', error)
    return null
  }
}

/**
 * Extract a frame from video using fluent-ffmpeg with enhanced error handling
 */
function extractFrameWithFFmpeg(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('🎬 FFmpeg: Starting frame extraction from:', inputPath)
    
    const command = ffmpeg(inputPath)
      .inputOptions(['-ss', '00:00:01']) // Seek to 1 second
      .outputOptions([
        '-vframes', '1', // Extract only 1 frame
        '-q:v', '2', // High quality
        '-vf', 'scale=400:300:force_original_aspect_ratio=decrease,pad=400:300:(ow-iw)/2:(oh-ih)/2' // Scale and pad to 400x300
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('🎬 FFmpeg: Command started:', commandLine)
      })
      .on('progress', (progress) => {
        console.log('🎬 FFmpeg: Progress:', progress.percent + '% done')
      })
      .on('end', () => {
        console.log('🎬 FFmpeg: Frame extraction completed successfully')
        resolve()
      })
      .on('error', (error) => {
        console.error('🎬 FFmpeg: Frame extraction failed:', error.message)
        reject(error)
      })
      .on('stderr', (stderrLine) => {
        console.log('🎬 FFmpeg: stderr:', stderrLine)
      })
    
    // Set timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.error('🎬 FFmpeg: Frame extraction timed out after 30 seconds')
      command.kill('SIGKILL')
      reject(new Error('Frame extraction timed out'))
    }, 30000)
    
    command.on('end', () => {
      clearTimeout(timeout)
    })
    
    command.on('error', () => {
      clearTimeout(timeout)
    })
    
    command.run()
  })
}

/**
 * Download a file from URL to local path
 */
async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`)
  }
  
  const buffer = await response.arrayBuffer()
  fs.writeFileSync(outputPath, Buffer.from(buffer))
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