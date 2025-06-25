import { NextResponse } from "next/server"
import { getPayload } from 'payload'
import config from '@/payload.config'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'image/jpg',
  'image/jfif',
  'image/pjpeg',
  'image/pjp',
  // Also allow video types
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/mov',
  'video/avi',
  'video/quicktime',
]

export async function POST(request: Request) {
  try {
    console.log('📁 UploadMedia: Starting media upload...')
    
    // Get the file from the request
    const formData = await request.formData()
    const file = formData.get("file") as File
    const alt = (formData.get("alt") as string) || "Uploaded media"

    console.log('📁 UploadMedia: File details:', {
      name: file?.name,
      type: file?.type,
      size: file?.size ? `${(file.size / 1024 / 1024).toFixed(2)}MB` : 'unknown',
      alt
    })

    // Validate file exists
    if (!file) {
      console.error('📁 UploadMedia: No file provided')
      return NextResponse.json(
        { error: 'No file provided' }, 
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      console.error('📁 UploadMedia: Invalid file type:', file?.type)
      return NextResponse.json(
        { 
          error: `Invalid file type. Allowed types are: ${ALLOWED_MIME_TYPES.join(', ')}`,
          providedType: file?.type 
        }, 
        { status: 400 }
      )
    }

    // Validate file size (50MB limit to match increased server action limit)
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      console.error('📁 UploadMedia: File too large:', file.size)
      return NextResponse.json(
        { 
          error: `File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB`,
          fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`
        }, 
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    console.log('📁 UploadMedia: Creating media document in Payload CMS...')
    
    // Use direct Payload API instead of HTTP request
    const payload = await getPayload({ config })
    
    const mediaDoc = await payload.create({
      collection: 'media',
      data: {
        alt: alt,
      },
      file: {
        data: buffer,
        mimetype: file.type,
        name: file.name,
        size: file.size,
      },
    })

    console.log('📁 UploadMedia: Upload successful:', mediaDoc.id)
    
    return NextResponse.json({
      success: true,
      url: mediaDoc.url,
      alt: mediaDoc.alt,
      id: mediaDoc.id
    })
  } catch (error) {
    console.error("📁 UploadMedia: Upload error:", error)
    return NextResponse.json(
      { 
        error: (error as Error).message,
        details: "If this error persists, please try a different file format or smaller file size",
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}

// Required for streaming uploads
export const config = {
  api: {
    bodyParser: false,
  },
}
