import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getImageUrl } from '@/lib/image-utils'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    
    // Get current user
    const { user } = await payload.auth({
      headers: request.headers,
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        message: 'Please log in to test profile images'
      }, { status: 401 })
    }

    console.log('🔍 [DEBUG] Starting comprehensive profile image debug...')

    // 1. Check media directory contents
    const mediaDir = path.join(process.cwd(), 'media')
    let mediaFiles = []
    try {
      if (fs.existsSync(mediaDir)) {
        mediaFiles = fs.readdirSync(mediaDir)
      }
    } catch (error) {
      console.error('Error reading media directory:', error)
    }

    // 2. Fetch user with full profile image data
    const fullUser = await payload.findByID({
      collection: 'users',
      id: user.id,
      depth: 3,
    })

    // 3. Get all users with profile images for testing
    const usersWithImages = await payload.find({
      collection: 'users',
      where: {
        profileImage: { exists: true }
      },
      depth: 3,
      limit: 10
    })

    // 4. Get all media objects from database
    const allMediaObjects = await payload.find({
      collection: 'media',
      limit: 20,
      sort: '-createdAt'
    })

    // 5. Test URL generation for each media object
    const mediaUrlTests = allMediaObjects.docs.map(media => {
      const directUrl = media.url
      const processedUrl = getImageUrl(media)
      const fileBasename = media.filename ? path.basename(media.filename) : null
      const expectedApiUrl = media.filename ? `/api/media/file/${media.filename}` : null
      const fileExistsOnDisk = media.filename ? fs.existsSync(path.join(mediaDir, media.filename)) : false
      
      return {
        id: media.id,
        filename: media.filename,
        directUrl,
        processedUrl,
        expectedApiUrl,
        fileExistsOnDisk,
        sizes: media.sizes ? Object.keys(media.sizes) : null,
        mimeType: media.mimeType,
        createdAt: media.createdAt
      }
    })

    // 6. Test specific URL processing
    const urlTests = {
      nullValue: {
        input: null,
        result: getImageUrl(null)
      },
      emptyString: {
        input: '',
        result: getImageUrl('')
      },
      stringUrl: {
        input: 'https://example.com/test.jpg',
        result: getImageUrl('https://example.com/test.jpg')
      },
      mediaObject: {
        input: { url: 'https://example.com/media.jpg', filename: 'test.jpg' },
        result: getImageUrl({ url: 'https://example.com/media.jpg', filename: 'test.jpg' })
      },
      mediaObjectWithFilename: {
        input: { filename: 'test.jpg' },
        result: getImageUrl({ filename: 'test.jpg' })
      }
    }

    // 7. Check if blob storage is configured
    const blobStorageConfigured = !!process.env.BLOB_READ_WRITE_TOKEN

    // 8. Test the current user's profile image processing
    let currentUserImageTest = null
    if (fullUser.profileImage) {
      currentUserImageTest = {
        originalData: fullUser.profileImage,
        processedUrl: getImageUrl(fullUser.profileImage),
        directUrl: fullUser.profileImage.url,
        filename: fullUser.profileImage.filename,
        fileExistsOnDisk: fullUser.profileImage.filename ? 
          fs.existsSync(path.join(mediaDir, fullUser.profileImage.filename)) : false
      }
    }

    const debugData = {
      systemInfo: {
        mediaDirectoryExists: fs.existsSync(mediaDir),
        mediaDirectoryPath: mediaDir,
        mediaFilesCount: mediaFiles.length,
        mediaFilesList: mediaFiles.slice(0, 10), // Show first 10 files
        blobStorageConfigured,
        nodeEnv: process.env.NODE_ENV,
        currentWorkingDirectory: process.cwd()
      },
      currentUser: {
        id: fullUser.id,
        name: fullUser.name,
        hasProfileImage: !!fullUser.profileImage,
        profileImageData: fullUser.profileImage,
        profileImageTest: currentUserImageTest
      },
      databaseStats: {
        totalMediaObjects: allMediaObjects.totalDocs,
        usersWithProfileImages: usersWithImages.totalDocs,
        mediaObjectsSample: allMediaObjects.docs.length
      },
      mediaUrlTests,
      urlProcessingTests: urlTests,
      usersWithProfileImages: usersWithImages.docs.map(user => ({
        id: user.id,
        name: user.name,
        profileImageData: user.profileImage,
        processedUrl: user.profileImage ? getImageUrl(user.profileImage) : null,
        fileExists: user.profileImage?.filename ? 
          fs.existsSync(path.join(mediaDir, user.profileImage.filename)) : false
      }))
    }

    console.log('✅ [DEBUG] Comprehensive profile image debug completed')

    return NextResponse.json({
      success: true,
      message: 'Comprehensive profile image debug data',
      data: debugData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [DEBUG] Profile image debug error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
} 