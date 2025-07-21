import { handleUpload, type HandleUploadBody, put } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname: string) => {
        // Generate a client token for the browser to upload the file
        // ⚠️ Authenticate users before generating the token.
        // Otherwise, you're allowing anonymous uploads.
        
        // Extract user ID from headers
        const userId = request.headers.get('x-user-id')
        if (!userId) {
          throw new Error('Not authenticated')
        }

        // Validate userId is a valid ObjectId
        if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
          throw new Error('Invalid user ID format')
        }

        // Verify user exists
        const payload = await getPayload({ config: payloadConfig })
        const user = await payload.findByID({
          collection: 'users',
          id: userId,
        })

        if (!user) {
          throw new Error('User not found')
        }

        return {
          allowedContentTypes: [
            'image/jpeg', 
            'image/jpg', 
            'image/png', 
            'image/webp', 
            'image/gif',
            'image/heic',
            'image/heif'
          ],
          tokenPayload: JSON.stringify({
            userId: user.id,
            userName: user.name || 'Anonymous User'
          }),
        }
      },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Get notified of client upload completion
        console.log('📸 Live photo upload completed:', {
          blobUrl: blob.url,
          blobPathname: blob.pathname,
          tokenPayload
        })

        try {
          if (!tokenPayload) {
            console.error('❌ No token payload provided')
            return
          }

          const { userId, userName } = JSON.parse(tokenPayload)
          const payload = await getPayload({ config: payloadConfig })

          // Determine file type from pathname extension
          const pathname = blob.pathname.toLowerCase()
          const isHeic = pathname.endsWith('.heic') || pathname.endsWith('.heif')
          
          let finalBlob = blob
          let convertedFilename = blob.pathname
          let finalMimeType = 'image/jpeg' // Default for converted files
          let convertedBuffer: Buffer | null = null

          if (isHeic) {
            console.log('🔄 Converting HEIC to JPEG:', blob.pathname)
            
            try {
              // Download the blob content
              const response = await fetch(blob.url)
              const arrayBuffer = await response.arrayBuffer()
              const buffer = Buffer.from(arrayBuffer)

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
          }

          // Create media document in Payload
          const media = await payload.create({
            collection: 'media',
            data: {
              alt: `Live photo from ${userName}`,
              uploadSource: 'mobile',
              filename: convertedFilename,
              mimeType: finalMimeType,
              filesize: convertedBuffer ? convertedBuffer.length : 0, // Use buffer size for converted files
              url: finalBlob.url,
              width: undefined, // Will be populated by Payload's image processing
              height: undefined,
              conversionStatus: isHeic ? 'converted' : 'not_needed',
              originalFilename: isHeic ? blob.pathname : undefined,
              originalUrl: isHeic ? blob.url : undefined,
            },
          })

          console.log('✅ Media document created for live photo:', {
            mediaId: media.id,
            filename: media.filename,
            converted: isHeic,
            originalPathname: blob.pathname,
            finalPathname: finalBlob.pathname
          })

          // Log the media ID for debugging
          console.log('📸 Media ID available for post creation:', media.id)

        } catch (error) {
          console.error('❌ Error processing live photo upload:', error)
          throw new Error('Could not process live photo upload')
        }
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('❌ Live photo upload error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    )
  }
} 