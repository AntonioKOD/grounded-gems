import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

// Helper function to check if file is HEIC
function isHEICFile(file: File): boolean {
  // Check by MIME type
  if (file.type === 'image/heic' || file.type === 'image/heif') {
    return true
  }
  
  // Check by file extension as fallback (since some browsers don't set MIME type correctly)
  const filename = file.name.toLowerCase()
  return filename.endsWith('.heic') || filename.endsWith('.heif')
}

// Helper function to check if file is a valid mobile image
function isValidMobileImage(file: File): boolean {
  const validTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 
    'image/svg+xml', 'image/avif', 'image/heic', 'image/heif',
    'image/bmp', 'image/tiff', 'image/tif', 'image/ico', 'image/x-icon',
    'image/vnd.microsoft.icon', 'image/jp2', 'image/jpx', 'image/jpm',
    'image/psd', 'image/raw', 'image/x-portable-bitmap', 
    'image/x-portable-pixmap', 'image/x-portable-graymap'
  ]
  
  return validTypes.includes(file.type) || isHEICFile(file)
}

// POST /api/media - Upload a new media file
export async function POST(req: NextRequest) {
  try {
    console.log('📁 [MEDIA UPLOAD] Starting file upload process')
    
    const payload = await getPayload({ config })
    
    // Get user from session
    const { user } = await payload.auth({ headers: req.headers })
    
    if (!user) {
      console.log('❌ [MEDIA UPLOAD] Authentication failed - no user found')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('✅ [MEDIA UPLOAD] User authenticated:', user.email)

    const formData = await req.formData()
    const file = formData.get('file') as File
    const alt = formData.get('alt') as string

    if (!file) {
      console.log('❌ [MEDIA UPLOAD] No file provided in request')
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Enhanced file type validation to include all mobile formats
    const isValidImageFile = isValidMobileImage(file)
    
    if (!isValidImageFile) {
      console.log('❌ [MEDIA UPLOAD] Invalid file type:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      })
      return NextResponse.json(
        { error: `File type not supported: ${file.type || 'unknown'}. Supported types: JPEG, PNG, GIF, WebP, AVIF, HEIC, HEIF, BMP, TIFF, ICO, and more.` },
        { status: 400 }
      )
    }

    // Validate file size (20MB max for mobile uploads)
    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
      console.log('❌ [MEDIA UPLOAD] File too large:', {
        fileName: file.name,
        fileSize: file.size,
        maxSize: maxSize
      })
      return NextResponse.json(
        { error: `File size must be less than 20MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 400 }
      )
    }

    // Log file info for debugging
    console.log(`📁 [MEDIA UPLOAD] File details:`, {
      name: file.name,
      type: file.type || 'unknown',
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      isHEIC: isHEICFile(file),
      user: user.email
    })
    
    if (isHEICFile(file)) {
      console.log(`📱 [MEDIA UPLOAD] HEIC file detected - will be processed by client before upload`)
    }

    // Create media document in PayloadCMS
    console.log('📁 [MEDIA UPLOAD] Creating media document in Payload...')
    
    const doc = await payload.create({
      collection: 'media',
      data: {
        alt: alt || file.name,
        uploadedBy: user.id,
        uploadSource: 'mobile', // Mark as mobile upload
      },
      file: {
        data: Buffer.from(await file.arrayBuffer()),
        mimetype: file.type || (isHEICFile(file) ? 'image/heic' : 'application/octet-stream'),
        name: file.name,
        size: file.size,
      },
      user,
    })

    console.log(`✅ [MEDIA UPLOAD] File uploaded successfully:`, {
      docId: doc.id,
      fileName: doc.filename,
      fileSize: doc.filesize,
      mimeType: doc.mimeType
    })

    return NextResponse.json({
      success: true,
      doc,
      message: 'File uploaded successfully'
    })

  } catch (error) {
    console.error('❌ [MEDIA UPLOAD] Error uploading media:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to upload file'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 