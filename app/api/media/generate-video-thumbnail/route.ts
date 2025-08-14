import { NextRequest, NextResponse } from "next/server"
import { getPayload } from "payload"
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import config from "@/payload.config"

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json()
    
    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 })
    }

    // Initialize payload with config
    const payload = await getPayload({ config })
    
    // Get the video document
    const videoDoc = await payload.findByID({
      collection: 'media',
      id: videoId,
    })

    if (!videoDoc) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    if (!videoDoc.isVideo) {
      return NextResponse.json({ error: "Document is not a video" }, { status: 400 })
    }

    if (videoDoc.videoThumbnail) {
      return NextResponse.json({ 
        message: "Video already has a thumbnail",
        thumbnailId: videoDoc.videoThumbnail
      })
    }

    console.log('🎬 Generating thumbnail for video:', videoDoc.filename)

    // Get the video file path
    const videoUrl = videoDoc.url
    if (!videoUrl) {
      return NextResponse.json({ error: "Video URL not found" }, { status: 400 })
    }

    // Generate thumbnail using FFmpeg
    const thumbnailBuffer = await generateThumbnailWithFFmpeg(videoUrl)
    
    if (!thumbnailBuffer) {
      return NextResponse.json({ error: "Failed to generate thumbnail" }, { status: 500 })
    }

    const thumbnailFilename = `thumb_${path.parse(videoDoc.filename || 'video').name}.png`

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
        mimetype: 'image/png',
        name: thumbnailFilename,
        size: thumbnailBuffer.length,
      },
    })

    // Update the video document with thumbnail reference
    await payload.update({
      collection: 'media',
      id: videoId,
      data: {
        videoThumbnail: thumbnailDoc.id,
      },
    })

    console.log('🎬 Thumbnail generated successfully:', thumbnailDoc.id)

    return NextResponse.json({
      success: true,
      thumbnailId: thumbnailDoc.id,
      thumbnailUrl: thumbnailDoc.url
    })

  } catch (error) {
    console.error('🎬 Error generating video thumbnail:', error)
    return NextResponse.json({ 
      error: "Failed to generate thumbnail",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function generateThumbnailWithFFmpeg(videoUrl: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      console.log('🎬 Using FFmpeg to generate thumbnail from:', videoUrl)
      
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
        console.log('🎬 FFmpeg stderr:', data.toString())
      })
      
      ffmpeg.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          const buffer = Buffer.concat(chunks)
          console.log('🎬 FFmpeg thumbnail generation successful')
          resolve(buffer)
        } else {
          console.log('🎬 FFmpeg thumbnail generation failed, code:', code)
          resolve(null)
        }
      })
      
      ffmpeg.on('error', (error) => {
        console.log('🎬 FFmpeg error:', error.message)
        resolve(null)
      })
      
      // Timeout after 15 seconds
      setTimeout(() => {
        ffmpeg.kill()
        console.log('🎬 FFmpeg thumbnail generation timed out')
        resolve(null)
      }, 15000)
      
    } catch (error) {
      console.log('🎬 FFmpeg generation error:', error)
      resolve(null)
    }
  })
} 