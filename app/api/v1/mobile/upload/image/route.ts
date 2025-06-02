/**
 * Mobile Image Upload API Route
 * 
 * This endpoint handles image uploads from the mobile app directly to Payload CMS.
 * Manual file processing to avoid DataView errors in image-size library.
 * 
 * Key features:
 * - Manual file processing bypassing Payload's automatic handlers
 * - Comprehensive file validation and error handling
 * - User authentication and authorization
 * - Mobile-optimized response format
 * 
 * Updated: Manual file handling to prevent DataView offset errors
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

interface MobileUploadResponse {
  success: boolean
  message: string
  data?: {
    url: string
    id: string
    filename: string
    mimeType: string
    filesize: number
    width?: number
    height?: number
    alt?: string
  }
  error?: string
  code?: string
}

// Maximum file size (10MB for mobile)
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes

// Allowed image types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
]

// Validate file buffer to ensure it's a valid image
function validateImageBuffer(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 10) return false // Too small to be a valid image
  
  // Check for common image file signatures
  const firstBytes = buffer.subarray(0, 10)
  
  // JPEG signatures
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    return firstBytes[0] === 0xFF && firstBytes[1] === 0xD8
  }
  
  // PNG signature
  if (mimeType.includes('png')) {
    return firstBytes[0] === 0x89 && 
           firstBytes[1] === 0x50 && 
           firstBytes[2] === 0x4E && 
           firstBytes[3] === 0x47
  }
  
  // WebP signature
  if (mimeType.includes('webp')) {
    return buffer.includes(Buffer.from('WEBP'))
  }
  
  // GIF signatures
  if (mimeType.includes('gif')) {
    return (firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46) // GIF87a or GIF89a
  }
  
  return true // Allow other types to pass through
}

// Simple image dimension detection to avoid image-size library
function getImageDimensions(buffer: Buffer, mimeType: string): { width?: number; height?: number } {
  try {
    if (mimeType.includes('png')) {
      // PNG dimensions are at bytes 16-23
      if (buffer.length >= 24) {
        const width = buffer.readUInt32BE(16)
        const height = buffer.readUInt32BE(20)
        return { width, height }
      }
    } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      // For JPEG, we'll skip dimension detection to avoid DataView errors
      // This prevents the image-size library issues
      return {}
    }
  } catch (error) {
    console.warn('Could not extract image dimensions:', error)
  }
  return {}
}

export async function POST(request: NextRequest): Promise<NextResponse<MobileUploadResponse>> {
  try {
    const payload = await getPayload({ config })
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '').replace('JWT ', '')

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'No authentication token provided',
          code: 'NO_TOKEN'
        },
        { status: 401 }
      )
    }

    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid token',
          error: 'Authentication token is invalid or expired',
          code: 'INVALID_TOKEN'
        },
        { status: 401 }
      )
    }

    console.log('📱 User authenticated successfully for upload:', user.email)

    // Parse form data to validate the file before sending to Payload
    let formData: FormData
    try {
      formData = await request.formData()
      console.log('📱 FormData parsed successfully')
    } catch (error) {
      console.error('📱 Failed to parse FormData:', error)
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid form data',
          error: 'Failed to parse uploaded file',
          code: 'INVALID_FORM_DATA'
        },
        { status: 400 }
      )
    }

    // Get the file from FormData
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: 'No file provided',
          error: 'A file is required for upload',
          code: 'NO_FILE'
        },
        { status: 400 }
      )
    }

    console.log('📱 File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: 'File too large',
          error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          code: 'FILE_TOO_LARGE'
        },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid file type',
          error: `File type must be one of: ${ALLOWED_TYPES.join(', ')}`,
          code: 'INVALID_FILE_TYPE'
        },
        { status: 400 }
      )
    }

    // Validate file content and get buffer
    let buffer: Buffer
    let dimensions: { width?: number; height?: number } = {}
    
    try {
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      
      if (!validateImageBuffer(buffer, file.type)) {
        console.error('📱 Invalid image file signature detected')
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid image file',
            error: 'The uploaded file does not appear to be a valid image',
            code: 'INVALID_IMAGE_FORMAT'
          },
          { status: 400 }
        )
      }
      
      // Get dimensions safely without using image-size library
      dimensions = getImageDimensions(buffer, file.type)
      
      console.log('📱 File validation passed:', {
        bufferSize: buffer.length,
        dimensions
      })
    } catch (validationError) {
      console.error('📱 File validation failed:', validationError)
      return NextResponse.json(
        {
          success: false,
          message: 'File validation failed',
          error: 'Unable to read the uploaded file',
          code: 'FILE_VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExtension = path.extname(file.name) || '.jpg'
    const uniqueFilename = `${uuidv4()}${fileExtension}`
    
    // Get metadata from _payload field
    let metadata: any = {}
    const payloadMetadata = formData.get('_payload')
    if (payloadMetadata) {
      try {
        metadata = JSON.parse(payloadMetadata as string)
      } catch (e) {
        console.warn('Invalid _payload metadata:', e)
      }
    }

    // Create media record manually without triggering Payload's file processing
    try {
      console.log('📱 Creating media record manually...')
      
      // Prepare the media data
      const mediaData = {
        filename: uniqueFilename,
        mimeType: file.type,
        filesize: buffer.length,
        width: dimensions.width,
        height: dimensions.height,
        alt: metadata.alt || file.name,
        uploadedBy: user.id,
        uploadSource: 'mobile',
        folder: metadata.folder || 'uploads',
        // Skip automatic file processing by not including file data
        url: `/media/${uniqueFilename}`, // We'll generate the URL
      }

      // Create the record in the database without file upload
      const uploadResult = await payload.create({
        collection: 'media',
        data: mediaData,
        // Don't pass file data to avoid Payload's automatic processing
      })

      console.log('📱 Media record created:', uploadResult.id)

      // Now manually save the file to the media directory
      const mediaDir = path.join(process.cwd(), 'media')
      
      // Ensure media directory exists
      if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true })
      }
      
      const filePath = path.join(mediaDir, uniqueFilename)
      fs.writeFileSync(filePath, buffer)
      
      console.log('📱 File saved to:', filePath)

      // Update the record with the correct URL after file is saved
      const finalUrl = `/media/${uniqueFilename}`
      await payload.update({
        collection: 'media',
        id: uploadResult.id,
        data: {
          url: finalUrl
        }
      })

      // Format response
      const response: MobileUploadResponse = {
        success: true,
        message: 'Image uploaded successfully',
        data: {
          id: uploadResult.id,
          url: finalUrl,
          filename: uniqueFilename,
          mimeType: file.type,
          filesize: buffer.length,
          width: dimensions.width,
          height: dimensions.height,
          alt: metadata.alt || file.name,
        },
      }

      return NextResponse.json(response, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        }
      })

    } catch (error: any) {
      console.error('📱 Manual upload failed:', error)
      
      return NextResponse.json(
        {
          success: false,
          message: 'Upload failed',
          error: 'Failed to save image to server storage',
          code: 'MANUAL_UPLOAD_FAILED',
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('📱 Upload route error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'Upload service unavailable',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
} 