import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import sharp from 'sharp'
import { put } from '@vercel/blob/client'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('📸 Direct live photo upload API called')

    // Get user ID from headers
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Validate userId is a valid ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      )
    }

    // Get user info
    const payload = await getPayload({ config: payloadConfig })
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log('📸 File received:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
    })

    // Validate file type
    if (file.type !== 'image/heic' && file.type !== 'image/heif') {
      return NextResponse.json(
        { error: 'Only HEIC/HEIF files are supported for live photos' },
        { status: 400 }
      )
    }

    // Validate file size (50MB limit for direct uploads)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 50MB' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload original file to Vercel Blob
    const blob = await put(file.name, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
    })

    console.log('📸 File uploaded to Vercel Blob:', {
      blobUrl: blob.url,
      blobPathname: blob.pathname
    })

    // Convert HEIC to JPEG
    let finalBlob = blob
    let convertedFilename = blob.pathname
    let finalMimeType = 'image/jpeg'
    let convertedBuffer: Buffer | null = null

    try {
      console.log('🔄 Converting HEIC to JPEG:', blob.pathname)
      
      // Convert HEIC to JPEG using Sharp
      convertedBuffer = await sharp(buffer, { failOnError: false })
        .jpeg({ 
          quality: 85,
          progressive: true,
          mozjpeg: true
        })
        .toBuffer()

      // Upload the converted JPEG to a new blob
      const jpegBlob = await put(
        blob.pathname.replace(/\.(heic|heif)$/i, '.jpg'),
        convertedBuffer,
        {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN || '',
        }
      )

      finalBlob = jpegBlob
      convertedFilename = jpegBlob.pathname
      finalMimeType = 'image/jpeg'
      console.log('✅ HEIC converted to JPEG successfully:', convertedFilename)
    } catch (conversionError) {
      console.error('❌ HEIC conversion error:', conversionError)
      console.warn('⚠️ Using original HEIC file:', blob.pathname)
      finalMimeType = 'image/heic'
    }

    // Create media document in Payload
    const media = await payload.create({
      collection: 'media',
      data: {
        alt: `Live photo from ${user.name || 'User'}`,
        uploadSource: 'mobile',
        filename: convertedFilename,
        mimeType: finalMimeType,
        filesize: convertedBuffer ? convertedBuffer.length : buffer.length,
        url: finalBlob.url,
        width: undefined,
        height: undefined,
        conversionStatus: 'converted',
        originalFilename: blob.pathname,
        originalUrl: blob.url,
      },
    })

    console.log('✅ Media document created for live photo:', {
      mediaId: media.id,
      filename: media.filename,
      converted: true,
      originalPathname: blob.pathname,
      finalPathname: finalBlob.pathname
    })

    return NextResponse.json({
      success: true,
      mediaId: media.id,
      filename: media.filename,
      url: finalBlob.url,
      converted: true
    })

  } catch (error) {
    console.error('❌ Direct live photo upload error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
} 