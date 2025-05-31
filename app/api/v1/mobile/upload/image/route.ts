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
  console.log('📱 Mobile upload request started')
  
  try {
    const payload = await getPayload({ config })
    console.log('📱 Payload instance obtained')

    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    console.log('📱 Auth header:', authHeader ? 'Present' : 'Missing')
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('📱 No valid auth header found')
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

    console.log('📱 Attempting user authentication...')
    const { user } = await payload.auth({ headers: request.headers })
    console.log('📱 User auth result:', user ? `User found: ${user.id}` : 'No user found')
    
    if (!user) {
      console.log('📱 Authentication failed - invalid token')
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

    console.log('📱 User authenticated successfully, parsing form data...')
    
    // Parse form data with detailed error handling
    let formData: FormData
    try {
      formData = await request.formData()
      console.log('📱 FormData parsed successfully')
      
      // Log all form data keys for debugging
      const keys = Array.from(formData.keys())
      console.log('📱 FormData keys:', keys)
      
      // Log each entry
      for (const [key, value] of formData.entries()) {
        console.log(`📱 FormData entry - ${key}:`, {
          type: typeof value,
          isFile: value instanceof File,
          value: value instanceof File ? `File: ${value.name} (${value.size} bytes, ${value.type})` : value
        })
      }
    } catch (formDataError) {
      console.error('📱 FormData parsing failed:', formDataError)
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to parse upload data',
          error: 'Invalid form data format',
          code: 'INVALID_FORM_DATA'
        },
        { status: 400 }
      )
    }

    const imageFile = formData.get('image') as File
    const folder = formData.get('folder') as string
    const alt = formData.get('alt') as string

    console.log('📱 Extracted form data:', {
      imageFile: imageFile ? `${imageFile.name} (${imageFile.size} bytes, ${imageFile.type})` : 'null',
      folder: folder || 'undefined',
      alt: alt || 'undefined'
    })

    // Validate file presence
    if (!imageFile) {
      console.log('📱 No image file provided in request')
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

    // Check if it's actually a File object
    if (!(imageFile instanceof File)) {
      console.log('📱 Image field is not a File object:', typeof imageFile, imageFile)
      
      // Handle React Native specific FormData format
      if (typeof imageFile === 'object' && imageFile !== null && 'uri' in imageFile) {
        console.log('📱 Detected React Native file object, attempting conversion...')
        // This is likely a React Native file object with uri, type, name properties
        const rnFile = imageFile as any
        console.log('📱 RN file properties:', {
          uri: rnFile.uri,
          type: rnFile.type,
          name: rnFile.name,
          size: rnFile.size
        })
        
        // Try to fetch the file from the URI and create a proper Buffer
        try {
          console.log('📱 Attempting to fetch React Native file...')
          const fileResponse = await fetch(rnFile.uri)
          
          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch file from URI: ${fileResponse.status}`)
          }
          
          const arrayBuffer = await fileResponse.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          
          console.log('📱 Successfully converted RN file to buffer, size:', buffer.length)
          
          // Create upload data from React Native file object
          const uploadData = {
            filename: rnFile.name || `mobile_upload_${Date.now()}.jpg`,
            mimeType: rnFile.type || 'image/jpeg',
            data: buffer,
            alt: alt || undefined,
            uploadedBy: user.id,
            uploadSource: 'mobile',
            folder: folder || 'uploads',
          }

          console.log('📱 Attempting to upload React Native file to Payload CMS...', {
            filename: uploadData.filename,
            mimeType: uploadData.mimeType,
            bufferSize: uploadData.data.length,
            uploadedBy: uploadData.uploadedBy,
            folder: uploadData.folder
          })

          // Upload to Payload CMS
          const uploadResult = await payload.create({
            collection: 'media',
            data: uploadData,
          })
          
          console.log('📱 React Native file upload successful:', uploadResult.id)

          // Get image dimensions if available
          let width: number | undefined
          let height: number | undefined

          try {
            if (uploadResult.width && uploadResult.height) {
              width = uploadResult.width
              height = uploadResult.height
              console.log('📱 Image dimensions:', width, 'x', height)
            }
          } catch (dimensionError) {
            console.warn('📱 Failed to get image dimensions:', dimensionError)
          }

          const response: MobileUploadResponse = {
            success: true,
            message: 'Image uploaded successfully',
            data: {
              url: uploadResult.url || '',
              id: uploadResult.id,
              filename: uploadResult.filename || rnFile.name,
              mimeType: uploadResult.mimeType || rnFile.type,
              filesize: uploadResult.filesize || buffer.length,
              width,
              height,
              alt: uploadResult.alt,
            },
          }

          console.log('📱 RN upload response prepared:', {
            id: response.data?.id,
            url: response.data?.url ? 'Present' : 'Missing',
            filename: response.data?.filename
          })

          return NextResponse.json(response, {
            status: 201,
            headers: {
              'Cache-Control': 'no-store',
              'X-Content-Type-Options': 'nosniff',
            }
          })
          
        } catch (rnError) {
          console.error('📱 Failed to process React Native file:', rnError)
          return NextResponse.json(
            {
              success: false,
              message: 'Failed to process React Native file',
              error: 'Unable to fetch and process file from React Native URI',
              code: 'RN_FILE_PROCESSING_FAILED'
            },
            { status: 400 }
          )
        }
      }
      
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid file format',
          error: 'Uploaded item is not a valid file',
          code: 'INVALID_FILE_OBJECT'
        },
        { status: 400 }
      )
    }

    console.log('📱 File validation - Type check...')
    // Validate file type
    if (!ALLOWED_TYPES.includes(imageFile.type)) {
      console.log('📱 Invalid file type:', imageFile.type, 'Allowed:', ALLOWED_TYPES)
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

    console.log('📱 File validation - Size check...')
    // Validate file size
    if (imageFile.size > MAX_FILE_SIZE) {
      console.log('📱 File too large:', imageFile.size, 'Max:', MAX_FILE_SIZE)
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

    console.log('📱 File validation - Filename check...')
    // Validate filename
    if (!imageFile.name || imageFile.name.length === 0) {
      console.log('📱 Invalid filename:', imageFile.name)
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

    console.log('📱 Converting file to buffer...')
    // Convert File to Buffer for Payload with error handling
    let buffer: Buffer
    try {
      const arrayBuffer = await imageFile.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      console.log('📱 Buffer created successfully, size:', buffer.length)
    } catch (bufferError) {
      console.error('📱 Buffer conversion failed:', bufferError)
      return NextResponse.json(
        {
          success: false,
          message: 'File processing failed',
          error: 'Unable to process uploaded file',
          code: 'FILE_PROCESSING_ERROR'
        },
        { status: 500 }
      )
    }

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

    console.log('📱 Attempting to upload to Payload CMS...', {
      filename: uploadData.filename,
      mimeType: uploadData.mimeType,
      bufferSize: uploadData.data.length,
      uploadedBy: uploadData.uploadedBy,
      folder: uploadData.folder
    })

    // Upload to Payload CMS with detailed error handling
    let uploadResult
    try {
      uploadResult = await payload.create({
        collection: 'media',
        data: uploadData,
      })
      console.log('📱 Payload upload successful:', uploadResult.id)
    } catch (payloadError) {
      console.error('📱 Payload upload failed:', payloadError)
      
      // Log more details about the error
      console.error('📱 Payload error details:', {
        message: payloadError instanceof Error ? payloadError.message : 'Unknown error',
        stack: payloadError instanceof Error ? payloadError.stack : 'No stack trace'
      })
      
      return NextResponse.json(
        {
          success: false,
          message: 'Upload failed',
          error: 'Failed to upload image to server storage',
          code: 'PAYLOAD_UPLOAD_FAILED'
        },
        { status: 500 }
      )
    }

    if (!uploadResult) {
      console.log('📱 Upload result is null/undefined')
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
        console.log('📱 Image dimensions:', width, 'x', height)
      }
    } catch (dimensionError) {
      console.warn('📱 Failed to get image dimensions:', dimensionError)
    }

    // Log upload activity
    try {
      console.log(`📱 Mobile image upload complete: ${uploadResult.filename} by user ${user.id}`)
    } catch (logError) {
      console.warn('📱 Failed to log upload activity:', logError)
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

    console.log('📱 Upload response prepared:', {
      id: response.data?.id,
      url: response.data?.url ? 'Present' : 'Missing',
      filename: response.data?.filename
    })

    return NextResponse.json(response, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      }
    })

  } catch (error) {
    console.error('📱 Mobile image upload error (main catch):', error)
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('📱 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('413') || error.message.includes('size')) {
        console.log('📱 File size error detected')
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
        console.log('📱 File type error detected')
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
    
    console.log('📱 Returning generic server error')
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