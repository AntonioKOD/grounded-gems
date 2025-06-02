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

export async function POST(request: NextRequest): Promise<NextResponse<MobileUploadResponse>> {
  try {
    const payload = await getPayload({ config })
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

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

    // Let Payload handle the file upload directly
    // Add the uploadedBy field to the request for Payload to process
    try {
      console.log('📱 Creating media record via Payload...')
      
      // Create the media record - Payload will handle FormData parsing automatically
      const uploadResult = await payload.create({
        collection: 'media',
        data: {
          uploadedBy: user.id, // Add the user reference directly
        },
        req: request, // Pass the request so Payload can access FormData
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