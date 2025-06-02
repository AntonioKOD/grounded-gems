/**
 * Mobile Image Upload API Route
 * 
 * This endpoint handles image uploads from the mobile app directly to Payload CMS.
 * It leverages Payload's built-in upload handling with proper authentication.
 * 
 * Key features:
 * - Direct integration with Payload CMS media collection
 * - Automatic file validation and processing
 * - User authentication and authorization
 * - Mobile-optimized response format
 * 
 * Updated: Latest version with improved error handling and Payload integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

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

    // Validate file content to prevent DataView errors
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
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
      
      console.log('📱 File validation passed, buffer size:', buffer.length)
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

    // Create the media record via Payload
    try {
      console.log('📱 Creating media record via Payload...')
      
      // Create a new FormData with validated file and user info
      const payloadFormData = new FormData()
      payloadFormData.append('file', file, file.name)
      
      // Add metadata
      const payloadMetadata = formData.get('_payload')
      if (payloadMetadata) {
        payloadFormData.append('_payload', payloadMetadata as string)
      }
      
      // Create a new request with the validated FormData
      const payloadRequest = new Request(request.url, {
        method: 'POST',
        headers: {
          'Authorization': request.headers.get('Authorization') || ''
        },
        body: payloadFormData
      })
      
      const uploadResult = await payload.create({
        collection: 'media',
        data: {
          uploadedBy: user.id,
        },
        req: payloadRequest,
      })

      console.log('📱 Upload successful via Payload:', uploadResult.id)

      // Format response
      const response: MobileUploadResponse = {
        success: true,
        message: 'Image uploaded successfully',
        data: {
          id: uploadResult.id,
          url: uploadResult.url || '',
          filename: uploadResult.filename || '',
          mimeType: uploadResult.mimeType || '',
          filesize: uploadResult.filesize || 0,
          width: uploadResult.width,
          height: uploadResult.height,
          alt: uploadResult.alt,
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
      console.error('📱 Payload upload failed:', error.name, error.message)
      console.error('📱 Payload error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        data: error.data,
      })
      
      // Handle specific DataView errors
      if (error.message?.includes('Offset is outside the bounds of the DataView') || 
          error.message?.includes('FileUploadError')) {
        return NextResponse.json(
          {
            success: false,
            message: 'Image file corrupted',
            error: 'The uploaded image file appears to be corrupted or incomplete. Please try uploading a different image.',
            code: 'CORRUPTED_IMAGE_FILE',
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        {
          success: false,
          message: 'Upload failed',
          error: 'Failed to upload image to server storage',
          code: 'PAYLOAD_UPLOAD_FAILED',
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