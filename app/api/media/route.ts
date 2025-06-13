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

// POST /api/media - Upload a new media file
export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get user from session
    const { user } = await payload.auth({ headers: req.headers })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const alt = formData.get('alt') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Enhanced file type validation to include HEIC
    const isValidImageFile = file.type.startsWith('image/') || isHEICFile(file)
    
    if (!isValidImageFile) {
      return NextResponse.json(
        { error: 'Only image files are allowed (including HEIC/HEIF)' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Log file info for debugging
    console.log(`📁 Uploading file: ${file.name}`)
    console.log(`📊 File type: ${file.type || 'unknown'}`)
    console.log(`📏 File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
    
    if (isHEICFile(file)) {
      console.log(`📱 HEIC file detected - will be processed by client before upload`)
    }

    // Create media document in PayloadCMS
    const doc = await payload.create({
      collection: 'media',
      data: {
        alt: alt || file.name,
      },
      file: {
        data: Buffer.from(await file.arrayBuffer()),
        mimetype: file.type || (isHEICFile(file) ? 'image/heic' : 'application/octet-stream'),
        name: file.name,
        size: file.size,
      },
      user,
    })

    console.log(`✅ File uploaded successfully: ${doc.id}`)

    return NextResponse.json({
      success: true,
      doc,
      message: 'File uploaded successfully'
    })

  } catch (error) {
    console.error('❌ Error uploading media:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
} 