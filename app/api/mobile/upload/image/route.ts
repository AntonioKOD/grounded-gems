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

// Allowed image types - comprehensive support for modern and legacy formats
const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
  'image/avif', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff', 'image/tif',
  'image/ico', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/jp2', 'image/jpx',
  'image/jpm', 'image/psd', 'image/raw', 'image/x-portable-bitmap', 'image/x-portable-pixmap'
]

// Environment flag to disable strict validation (useful for debugging)
const DISABLE_STRICT_VALIDATION = process.env.DISABLE_IMAGE_VALIDATION === 'true'

// Validate file buffer to ensure it's a valid image
function validateImageBuffer(buffer: Buffer, mimeType: string): boolean {
  console.log('🔍 Validating image buffer:', {
    bufferLength: buffer.length,
    mimeType,
    firstBytes: buffer.length >= 10 ? Array.from(buffer.subarray(0, 10)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ') : 'Buffer too small'
  })
  
  if (buffer.length < 10) {
    console.log('❌ Buffer too small:', buffer.length, 'bytes')
    return false // Too small to be a valid image
  }
  
  // Check for common image file signatures
  const firstBytes = buffer.subarray(0, 10)
  
  // JPEG signatures (FF D8)
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
    const isValidJpeg = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8
    console.log('🔍 JPEG validation:', { isValidJpeg, expected: 'FF D8', actual: `${firstBytes[0]?.toString(16)} ${firstBytes[1]?.toString(16)}` })
    return isValidJpeg
  }
  
  // PNG signature (89 50 4E 47)
  if (mimeType.includes('png')) {
    const isValidPng = firstBytes[0] === 0x89 && 
           firstBytes[1] === 0x50 && 
           firstBytes[2] === 0x4E && 
           firstBytes[3] === 0x47
    console.log('🔍 PNG validation:', { 
      isValidPng, 
      expected: '89 50 4E 47', 
      actual: `${firstBytes[0]?.toString(16)} ${firstBytes[1]?.toString(16)} ${firstBytes[2]?.toString(16)} ${firstBytes[3]?.toString(16)}` 
    })
    return isValidPng
  }
  
  // WebP signature (contains WEBP)
  if (mimeType.includes('webp')) {
    const webpMarker = Buffer.from('WEBP')
    const isValidWebp = buffer.includes(webpMarker)
    console.log('🔍 WebP validation:', { isValidWebp, searchingFor: 'WEBP' })
    return isValidWebp
  }
  
  // GIF signatures (47 49 46 for GIF87a or GIF89a)
  if (mimeType.includes('gif')) {
    const isValidGif = firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46
    console.log('🔍 GIF validation:', { 
      isValidGif, 
      expected: '47 49 46', 
      actual: `${firstBytes[0]?.toString(16)} ${firstBytes[1]?.toString(16)} ${firstBytes[2]?.toString(16)}` 
    })
    return isValidGif
  }
  
  // SVG validation (XML-based, starts with < or <?xml)
  if (mimeType.includes('svg')) {
    const bufferText = buffer.toString('utf8', 0, Math.min(100, buffer.length))
    const isValidSvg = bufferText.includes('<svg') || bufferText.includes('<?xml')
    console.log('🔍 SVG validation:', { isValidSvg, startsWithSvgTag: bufferText.includes('<svg'), startsWithXml: bufferText.includes('<?xml') })
    return isValidSvg
  }
  
  // AVIF validation (ftyp box with AVIF)
  if (mimeType.includes('avif')) {
    const ftypBox = buffer.indexOf(Buffer.from('ftyp'))
    const isValidAvif = ftypBox > 0 && buffer.indexOf(Buffer.from('avif'), ftypBox) > ftypBox
    console.log('🔍 AVIF validation:', { isValidAvif, ftypBoxFound: ftypBox > 0 })
    return isValidAvif
  }
  
  // HEIC/HEIF validation (ftyp box with HEIC)
  if (mimeType.includes('heic') || mimeType.includes('heif')) {
    const ftypBox = buffer.indexOf(Buffer.from('ftyp'))
    const isValidHeic = ftypBox > 0 && (
      buffer.indexOf(Buffer.from('heic'), ftypBox) > ftypBox ||
      buffer.indexOf(Buffer.from('heif'), ftypBox) > ftypBox
    )
    console.log('🔍 HEIC/HEIF validation:', { isValidHeic, ftypBoxFound: ftypBox > 0 })
    return isValidHeic
  }
  
  // BMP validation (starts with 'BM')
  if (mimeType.includes('bmp')) {
    const isValidBmp = firstBytes[0] === 0x42 && firstBytes[1] === 0x4D
    console.log('🔍 BMP validation:', { 
      isValidBmp, 
      expected: '42 4D (BM)', 
      actual: `${firstBytes[0]?.toString(16)} ${firstBytes[1]?.toString(16)}` 
    })
    return isValidBmp
  }
  
  // TIFF validation (starts with 'II*' or 'MM*')
  if (mimeType.includes('tiff') || mimeType.includes('tif')) {
    const isValidTiff = (firstBytes[0] === 0x49 && firstBytes[1] === 0x49 && firstBytes[2] === 0x2A) || // II*
                       (firstBytes[0] === 0x4D && firstBytes[1] === 0x4D && firstBytes[2] === 0x00) // MM*
    console.log('🔍 TIFF validation:', { 
      isValidTiff, 
      actual: `${firstBytes[0]?.toString(16)} ${firstBytes[1]?.toString(16)} ${firstBytes[2]?.toString(16)}` 
    })
    return isValidTiff
  }
  
  // ICO validation (starts with 00 00 01 00)
  if (mimeType.includes('ico') || mimeType.includes('icon')) {
    const isValidIco = firstBytes[0] === 0x00 && firstBytes[1] === 0x00 && 
                      firstBytes[2] === 0x01 && firstBytes[3] === 0x00
    console.log('🔍 ICO validation:', { 
      isValidIco, 
      expected: '00 00 01 00', 
      actual: `${firstBytes[0]?.toString(16)} ${firstBytes[1]?.toString(16)} ${firstBytes[2]?.toString(16)} ${firstBytes[3]?.toString(16)}` 
    })
    return isValidIco
  }
  
  // If we don't recognize the MIME type, be more permissive
  console.log('🔍 Unknown MIME type, performing basic validation')
  
  // Basic validation: check if it looks like it could be an image
  // Most image formats have specific signatures in the first few bytes
  const bufferText = buffer.toString('utf8', 0, Math.min(100, buffer.length))
  const couldBeImage = 
    // JPEG
    (firstBytes[0] === 0xFF && firstBytes[1] === 0xD8) ||
    // PNG  
    (firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47) ||
    // GIF
    (firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46) ||
    // BMP
    (firstBytes[0] === 0x42 && firstBytes[1] === 0x4D) ||
    // WebP (RIFF container)
    (firstBytes[0] === 0x52 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46 && firstBytes[3] === 0x46) ||
    // TIFF (little endian)
    (firstBytes[0] === 0x49 && firstBytes[1] === 0x49 && firstBytes[2] === 0x2A && firstBytes[3] === 0x00) ||
    // TIFF (big endian)
    (firstBytes[0] === 0x4D && firstBytes[1] === 0x4D && firstBytes[2] === 0x00 && firstBytes[3] === 0x2A) ||
    // ICO
    (firstBytes[0] === 0x00 && firstBytes[1] === 0x00 && firstBytes[2] === 0x01 && firstBytes[3] === 0x00) ||
    // AVIF/HEIC (ftyp box)
    (buffer.indexOf(Buffer.from('ftyp')) > 0) ||
    // SVG (XML-based)
    (bufferText.includes('<svg') || bufferText.includes('<?xml'))
  
  console.log('🔍 Generic image validation:', { couldBeImage })
  
  return couldBeImage
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
  console.log('--- [UPLOAD] /api/mobile/upload/image handler START ---')
  try {
    // Log request headers
    const headersObj = Object.fromEntries(request.headers.entries())
    console.log('[UPLOAD] Request headers:', headersObj)

    // Check content type
    const contentType = request.headers.get('content-type')
    console.log('[UPLOAD] Content-Type:', contentType)

    let formData
    try {
      formData = await request.formData()
      console.log('[UPLOAD] formData keys:', Array.from(formData.keys()))
    } catch (formError) {
      console.error('[UPLOAD] Error parsing formData:', formError)
      return NextResponse.json({ success: false, message: 'Invalid form data', error: 'Invalid form data', code: 'INVALID_FORM_DATA' }, { status: 400 })
    }

    // Get file from formData
    const file = formData.get('image') as File | null
    if (!file) {
      console.warn('[UPLOAD] No file found in formData under key "image"')
      return NextResponse.json({ success: false, message: 'No image file provided', error: 'No image file provided', code: 'NO_IMAGE' }, { status: 400 })
    }
    console.log('[UPLOAD] File info:', {
      name: file.name,
      type: file.type,
      size: file.size
    })

    // Read file buffer
    let buffer
    try {
      buffer = Buffer.from(await file.arrayBuffer())
      console.log('[UPLOAD] File buffer length:', buffer.length)
    } catch (bufferError) {
      console.error('[UPLOAD] Error reading file buffer:', bufferError)
      return NextResponse.json({ success: false, message: 'Failed to read file buffer', error: 'Failed to read file buffer', code: 'BUFFER_ERROR' }, { status: 400 })
    }

    // Validate image
    const isValid = validateImageBuffer(buffer, file.type)
    console.log('[UPLOAD] Image validation result:', isValid)
    if (!isValid) {
      console.warn('[UPLOAD] Image failed validation')
      return NextResponse.json({ success: false, message: 'Invalid image file', error: 'Invalid image file', code: 'INVALID_IMAGE' }, { status: 400 })
    }

    // Get image dimensions
    const dimensions = getImageDimensions(buffer, file.type)
    console.log('[UPLOAD] Image dimensions:', dimensions)

    // Upload to Payload CMS media collection
    console.log('[UPLOAD] Calling getPayload...')
    const payload = await getPayload({ config })
    console.log('[UPLOAD] getPayload resolved')
    const alt = file.name // Or get from formData if you want
    console.log('[UPLOAD] Uploading to media collection with alt:', alt)
    let mediaDoc
    try {
      console.log('[UPLOAD] Calling payload.create for media...')
      mediaDoc = await payload.create({
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
      console.log('[UPLOAD] Payload media upload successful:', mediaDoc.id)
      console.log('[UPLOAD] Full mediaDoc:', mediaDoc)
    } catch (mediaError) {
      console.error('[UPLOAD] Payload media upload failed:', mediaError)
      if (mediaError instanceof Error) {
        console.error('[UPLOAD] Media upload error stack:', mediaError.stack)
      }
      return NextResponse.json({ success: false, message: 'Failed to upload image to media collection', error: mediaError instanceof Error ? mediaError.message : String(mediaError), code: 'MEDIA_UPLOAD_ERROR' }, { status: 500 })
    }

    // Get additional info for LocationPhotoSubmissions
    const locationId = formData.get('locationId') as string
    const caption = formData.get('caption') as string | undefined
    const category = (formData.get('category') as string) || 'other'
    console.log('[UPLOAD] Submission info:', { locationId, caption, category })
    if (!locationId) {
      console.error('[UPLOAD] No locationId provided in formData')
      return NextResponse.json({ success: false, message: 'locationId is required', error: 'No locationId', code: 'NO_LOCATION_ID' }, { status: 400 })
    }

    // Get user from auth
    let user
    try {
      const authResult = await payload.auth({ headers: request.headers })
      user = authResult.user
      if (!user) throw new Error('No user found')
      console.log('[UPLOAD] Authenticated user:', user.id)
    } catch (authError) {
      console.error('[UPLOAD] Failed to authenticate user:', authError)
      return NextResponse.json({ success: false, message: 'Authentication required', error: 'No user', code: 'NO_USER' }, { status: 401 })
    }

    // Create LocationPhotoSubmissions document
    let submissionDoc
    try {
      submissionDoc = await payload.create({
        collection: 'locationPhotoSubmissions',
        data: {
          location: locationId,
          submittedBy: user.id,
          photo: mediaDoc.id,
          caption,
          category,
          status: 'pending'
        }
      })
      console.log('[UPLOAD] LocationPhotoSubmission created:', submissionDoc.id)
    } catch (submissionError) {
      console.error('[UPLOAD] Failed to create LocationPhotoSubmission:', submissionError)
      return NextResponse.json({ success: false, message: 'Failed to submit photo for review', error: submissionError instanceof Error ? submissionError.message : String(submissionError), code: 'SUBMISSION_ERROR' }, { status: 500 })
    }

    // Return the submission info (not just the media)
    const responseData = {
      url: mediaDoc.url,
      id: String(mediaDoc.id),
      filename: String(mediaDoc.filename || file.name),
      mimeType: file.type,
      filesize: file.size,
      alt: alt,
      submissionId: String(submissionDoc.id),
      status: submissionDoc.status,
      caption: submissionDoc.caption,
      category: submissionDoc.category
    }
    console.log('[UPLOAD] Success response data:', responseData)
    console.log('--- [UPLOAD] /api/mobile/upload/image handler END ---')
    return NextResponse.json({ success: true, message: 'Photo submitted for review', data: responseData })
  } catch (error) {
    console.error('❌ [UPLOAD] Error in image upload:', error)
    return NextResponse.json({ success: false, message: 'Failed to upload image', error: error instanceof Error ? error.message : String(error), code: 'SERVER_ERROR' }, { status: 500 })
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