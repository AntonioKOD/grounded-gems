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
    if (!authHeader?.startsWith('Bearer ')) {
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

    // Parse form data
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const folder = formData.get('folder') as string
    const alt = formData.get('alt') as string

    // Validate file presence
    if (!imageFile) {
      return NextResponse.json(
        {
          success: false,
          message: 'No image file provided',
          error: 'Image file is required',
          code: 'NO_FILE'
        },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(imageFile.type)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid file type',
          error: `Only ${ALLOWED_TYPES.join(', ')} files are allowed`,
          code: 'INVALID_FILE_TYPE'
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (imageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: 'File too large',
          error: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          code: 'FILE_TOO_LARGE'
        },
        { status: 400 }
      )
    }

    // Validate filename
    if (!imageFile.name || imageFile.name.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid filename',
          error: 'File must have a valid name',
          code: 'INVALID_FILENAME'
        },
        { status: 400 }
      )
    }

    // Convert File to Buffer for Payload
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Prepare upload data
    const uploadData = {
      filename: imageFile.name,
      mimeType: imageFile.type,
      data: buffer,
      alt: alt || undefined,
      // Add user metadata
      uploadedBy: user.id,
      uploadSource: 'mobile',
      folder: folder || 'uploads',
    }

    // Upload to Payload CMS
    const uploadResult = await payload.create({
      collection: 'media',
      data: uploadData,
    })

    if (!uploadResult) {
      return NextResponse.json(
        {
          success: false,
          message: 'Upload failed',
          error: 'Failed to upload image to server',
          code: 'UPLOAD_FAILED'
        },
        { status: 500 }
      )
    }

    // Get image dimensions if available
    let width: number | undefined
    let height: number | undefined

    try {
      if (uploadResult.width && uploadResult.height) {
        width = uploadResult.width
        height = uploadResult.height
      }
    } catch (dimensionError) {
      console.warn('Failed to get image dimensions:', dimensionError)
    }

    // Log upload activity (optional)
    try {
      console.log(`Mobile image upload: ${uploadResult.filename} by user ${user.id}`)
    } catch (logError) {
      console.warn('Failed to log upload activity:', logError)
    }

    const response: MobileUploadResponse = {
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: uploadResult.url || '',
        id: uploadResult.id,
        filename: uploadResult.filename || imageFile.name,
        mimeType: uploadResult.mimeType || imageFile.type,
        filesize: uploadResult.filesize || imageFile.size,
        width,
        height,
        alt: uploadResult.alt,
      },
    }

    return NextResponse.json(response, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('Mobile image upload error:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('413') || error.message.includes('size')) {
        return NextResponse.json(
          {
            success: false,
            message: 'File too large',
            error: 'The uploaded file exceeds the maximum size limit',
            code: 'FILE_TOO_LARGE'
          },
          { status: 413 }
        )
      }

      if (error.message.includes('415') || error.message.includes('type')) {
        return NextResponse.json(
          {
            success: false,
            message: 'Unsupported file type',
            error: 'The uploaded file type is not supported',
            code: 'UNSUPPORTED_FILE_TYPE'
          },
          { status: 415 }
        )
      }
    }
    
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