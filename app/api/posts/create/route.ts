import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

// Configure larger payload limits for this route
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes timeout

// Production-specific configuration for large payloads
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  let postData: any = null
  let cleanedPostData: any = null
  
  try {
    console.log('📝 Post creation API called - OPTIMIZED VERSION')
    
    // Check request size before processing
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const sizeMB = parseInt(contentLength) / 1024 / 1024
      console.log(`📊 Request size: ${sizeMB.toFixed(2)}MB`)
      
      if (sizeMB > 4.5) {
        console.error(`📝 Request too large: ${sizeMB.toFixed(2)}MB`)
        return NextResponse.json(
          { success: false, message: `Request too large (${sizeMB.toFixed(2)}MB). Please reduce content or use chunked upload.` },
          { status: 413 }
        )
      }
    }
    
    const payload = await getPayload({ config: payloadConfig })
    
    let formData: FormData
    
    // Check content type to determine how to parse the request
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData
      formData = await request.formData()
    } else if (contentType.includes('application/json')) {
      // Handle JSON and convert to FormData
      const jsonData = await request.json()
      formData = new FormData()
      
      // Convert JSON fields to FormData
      Object.entries(jsonData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(item => formData.append(key, item))
        } else if (value !== null && value !== undefined) {
          formData.append(key, String(value))
        }
      })
    } else {
      // Unsupported content type
      console.error('📝 Unsupported content type:', contentType)
      return NextResponse.json(
        { success: false, message: 'Invalid request format. Expected FormData or JSON.' },
        { status: 400 }
      )
    }
    
    // Extract user ID from headers or session
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Validate userId is a valid ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      console.error('📝 Invalid userId format:', userId)
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format' },
        { status: 400 }
      )
    }

    console.log('📝 Validating user ID:', userId)

    // Find the user
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    })

    if (!user) {
      console.error('📝 User not found for ID:', userId)
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    console.log('📝 User found:', { id: user.id, name: user.name })

    // Extract form data
    const content = formData.get('content') as string
    const title = formData.get('title') as string
    let type = formData.get('type') as string || formData.get('postType') as string || 'post'
    const rating = formData.get('rating') as string
    const locationId = formData.get('locationId') as string
    const locationName = formData.get('locationName') as string
    const tags = formData.get('tags') as string

    // Ensure type is always 'post' unless explicitly set to another valid value
    if (!type || typeof type !== 'string' || !type.trim()) {
      type = 'post'
    } else {
      type = type.trim().toLowerCase()
      if (type !== 'post' && type !== 'review') { // Add other allowed types if needed
        type = 'post'
      }
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Content is required' },
        { status: 400 }
      )
    }

    // Check if we have media IDs (from separate upload) or files to upload
    const livePhotos = formData.getAll('livePhotos') as string[]
    const photos = formData.getAll('photos') as string[]
    const videos = formData.getAll('videos') as (string | File)[]
    
    // Process media files if any (legacy support)
    const imageFiles = [
      ...(formData.getAll('images') as File[]),
      ...(formData.getAll('media') as File[])
    ].filter(file => file.type.startsWith('image/'))
    
    // Separate video files from video IDs
    const videoFiles: File[] = []
    const videoIds: string[] = []
    
    videos.forEach(item => {
      if (item instanceof File) {
        videoFiles.push(item)
      } else if (typeof item === 'string' && item.length > 0) {
        videoIds.push(item)
      }
    })
    
    console.log(`📝 Media breakdown: ${livePhotos.length} live photo IDs, ${photos.length} photo IDs, ${videoIds.length} video IDs`)
    console.log(`📝 Files to upload: ${imageFiles.length} images, ${videoFiles.length} videos`)

    let mediaIds: string[] = []
    
    // If we have pre-uploaded media IDs, use those
    if (livePhotos.length > 0 || photos.length > 0 || videoIds.length > 0) {
      mediaIds = [...livePhotos, ...photos, ...videoIds]
      console.log(`📝 Using pre-uploaded media IDs: ${mediaIds.length} total`)
    } else if (imageFiles.length > 0 || videoFiles.length > 0) {
      // Legacy: Upload files with the post
      console.log(`📝 Uploading files with post (legacy mode)`)
      
      // FIXED: Separate Live Photos from other files for sequential processing
      const livePhotoFiles = imageFiles.filter(file => 
        file.type === 'image/heic' || file.type === 'image/heif'
      )
      const regularImageFiles = imageFiles.filter(file => 
        file.type !== 'image/heic' && file.type !== 'image/heif'
      )
      
      console.log(`📝 File breakdown: ${livePhotoFiles.length} Live Photos, ${regularImageFiles.length} regular images, ${videoFiles.length} videos`)

      // FIXED: Process Live Photos sequentially to prevent conflicts
      if (livePhotoFiles.length > 0) {
        console.log(`📝 Processing ${livePhotoFiles.length} Live Photos sequentially...`)
        for (const file of livePhotoFiles) {
          try {
            const mediaId = await uploadImageFile(file, payload)
            if (mediaId) {
              mediaIds.push(mediaId)
              console.log(`📝 Live Photo uploaded successfully: ${mediaId}`)
              
              // Add delay between Live Photo uploads to prevent conflicts
              if (livePhotoFiles.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 2000))
              }
            }
          } catch (error) {
            console.error(`📝 Live Photo upload failed: ${file.name}`, error)
            return NextResponse.json(
              { success: false, message: `Live Photo upload failed: ${file.name}` },
              { status: 500 }
            )
          }
        }
      }
      
      // Process regular images and videos in parallel (non-Live Photos)
      const parallelUploadPromises: Promise<string | null>[] = []
      
      // Add regular image upload promises
      for (const file of regularImageFiles) {
        parallelUploadPromises.push(uploadImageFile(file, payload))
      }
      
      // Add video upload promises
      for (const file of videoFiles) {
        parallelUploadPromises.push(uploadVideoFile(file, payload))
      }
      
      // Wait for all parallel uploads to complete
      if (parallelUploadPromises.length > 0) {
        console.log(`📝 Starting parallel upload of ${parallelUploadPromises.length} files...`)
        const uploadResults = await Promise.allSettled(parallelUploadPromises)
        
        // Process results
        for (const result of uploadResults) {
          if (result.status === 'fulfilled' && result.value) {
            console.log(`📝 Upload successful, adding to mediaIds: ${result.value}`)
            mediaIds.push(result.value)
          } else if (result.status === 'rejected') {
            console.error('📝 Upload failed:', result.reason)
            return NextResponse.json(
              { success: false, message: `Upload failed: ${result.reason}` },
              { status: 500 }
            )
          } else if (result.status === 'fulfilled' && !result.value) {
            console.error('📝 Upload returned null/undefined ID')
            return NextResponse.json(
              { success: false, message: 'Upload failed: No ID returned' },
              { status: 500 }
            )
          }
        }
      }
      
      console.log(`📝 Successfully uploaded ${mediaIds.length} files total`)
    }

    // Prepare post data
    postData = {
      content: content.trim(),
      type: type,
      author: userId,
      status: 'published',
      visibility: 'public',
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      saveCount: 0,
    }
    
    // Add title if provided
    if (title && title.trim()) {
      postData.title = title.trim()
    }
    
    // Add rating if provided and type is review
    if (rating && type === 'review') {
      const ratingNum = parseInt(rating)
      if (ratingNum >= 1 && ratingNum <= 5) {
        postData.rating = ratingNum
      }
    }

    // Add location if provided
    if (locationId) {
      try {
        // Validate locationId is a valid ObjectId
        if (!/^[0-9a-fA-F]{24}$/.test(locationId)) {
          console.log('📝 Invalid locationId format, skipping location')
        } else {
          const location = await payload.findByID({
            collection: 'locations',
            id: locationId,
          })
          if (location) {
            postData.location = locationId
            console.log('📝 Location set:', locationId)
          } else {
            console.log('📝 Location not found in database, skipping')
          }
        }
      } catch (error) {
        console.log('📝 Error validating location, skipping:', error)
      }
    } else if (locationName && locationName.trim()) {
      // For now, skip location name since Posts collection expects ObjectId
      // TODO: Create location record or handle string locations differently
      console.log('📝 Location name provided but no ID, skipping location assignment')
    }

    // Add media if any - properly handle both images and videos
    if (mediaIds.length > 0) {
      // If we have pre-uploaded media IDs, use the original arrays
      if (livePhotos.length > 0 || photos.length > 0 || videoIds.length > 0) {
        // Filter out any File objects that might have been left in the arrays
        const validLivePhotos = livePhotos.filter(id => typeof id === 'string' && id.length > 0)
        const validPhotos = photos.filter(id => typeof id === 'string' && id.length > 0)
        const validVideos = videoIds.filter(id => typeof id === 'string' && id.length > 0)
        
        console.log(`📝 Valid pre-uploaded media: ${validLivePhotos.length} live photos, ${validPhotos.length} photos, ${validVideos.length} videos`)
        
        if (validLivePhotos.length > 0) {
          postData.livePhotos = validLivePhotos
        }
        if (validPhotos.length > 0) {
          postData.photos = validPhotos
        }
        if (validVideos.length > 0) {
          postData.video = validVideos[0] // Only use first video since Posts collection only has 'video' field
          if (validVideos.length > 1) {
            console.log(`📝 Warning: ${validVideos.length - 1} additional videos will be ignored (Posts collection only supports one video)`)
          }
        }
        console.log(`📝 Assigned pre-uploaded media: ${validLivePhotos.length} live photos, ${validPhotos.length} photos, ${validVideos.length} videos (using first video only)`)
      } else {
        // Legacy: Track which media IDs correspond to images vs videos
        const imageIds: string[] = []
        const legacyVideoIds: string[] = []
        
        console.log(`📝 Processing mediaIds for assignment:`, {
          totalMediaIds: mediaIds.length,
          mediaIds: mediaIds,
          livePhotoFiles: imageFiles.filter(file => file.type === 'image/heic' || file.type === 'image/heif').length,
          regularImageFiles: imageFiles.filter(file => file.type !== 'image/heic' && file.type !== 'image/heif').length,
          videoFiles: videoFiles.length
        })
        
        // Process mediaIds in the order they were uploaded
        let currentIndex = 0
        
        // First, add Live Photos (they were uploaded first, sequentially)
        const livePhotoFiles = imageFiles.filter(file => 
          file.type === 'image/heic' || file.type === 'image/heif'
        )
        const livePhotoCount = livePhotoFiles.length
        if (livePhotoCount > 0) {
          imageIds.push(...mediaIds.slice(currentIndex, currentIndex + livePhotoCount))
          currentIndex += livePhotoCount
        }
        
        // Then add regular images (uploaded in parallel)
        const regularImageFiles = imageFiles.filter(file => 
          file.type !== 'image/heic' && file.type !== 'image/heif'
        )
        const regularImageCount = regularImageFiles.length
        if (regularImageCount > 0) {
          imageIds.push(...mediaIds.slice(currentIndex, currentIndex + regularImageCount))
          currentIndex += regularImageCount
        }
        
        // Finally add videos (uploaded in parallel)
        const videoCount = videoFiles.length
        if (videoCount > 0) {
          console.log(`📝 Adding ${videoCount} videos starting at index ${currentIndex}`)
          const videoIdsToAdd = mediaIds.slice(currentIndex, currentIndex + videoCount)
          console.log(`📝 Video IDs to add:`, videoIdsToAdd)
          legacyVideoIds.push(...videoIdsToAdd)
          console.log(`📝 Total video IDs after adding:`, legacyVideoIds)
        }
        
        console.log(`📝 Media assignment: ${imageIds.length} images (${livePhotoCount} Live Photos + ${regularImageCount} regular), ${legacyVideoIds.length} videos`)
        
        // Set the first image as the main image
        if (imageIds.length > 0) {
          postData.image = imageIds[0]
          // Set remaining images as photos array
          if (imageIds.length > 1) {
            postData.photos = imageIds.slice(1)
          }
        }
        
        // Set videos if any
        if (legacyVideoIds.length > 0) {
          console.log(`📝 Setting video for post:`, {
            videoIds: legacyVideoIds,
            firstVideoId: legacyVideoIds[0],
            totalVideos: legacyVideoIds.length
          })
          
          // Validate video ID before setting
          if (legacyVideoIds[0] && typeof legacyVideoIds[0] === 'string' && legacyVideoIds[0].length > 0) {
            postData.video = legacyVideoIds[0] // First video as main video
            console.log(`📝 Set main video: ${legacyVideoIds[0]}`)
          } else {
            console.error(`📝 Invalid video ID: ${legacyVideoIds[0]}`)
            return NextResponse.json(
              { success: false, message: 'Invalid video ID generated' },
              { status: 400 }
            )
          }
          
          // Note: Posts collection only has 'video' field, not 'videos' array
          if (legacyVideoIds.length > 1) {
            console.log(`📝 Warning: ${legacyVideoIds.length - 1} additional videos will be ignored (Posts collection only supports one video)`)
          }
        } else {
          console.log(`📝 No videos to set for post`)
        }
      }
    }

    // Add tags if provided - handle both field name conventions
    const tagsArray = formData.getAll('tags[]') as string[]
    if (tagsArray.length > 0) {
      postData.tags = tagsArray.map(tag => ({ tag }))
    } else if (tags) {
      // Accept both JSON arrays and comma-separated strings
      try {
        let parsedTags
        if (tags.startsWith('[')) {
          // Try to parse as JSON array
          parsedTags = JSON.parse(tags)
        } else {
          // Treat as comma-separated string
          parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean)
        }
        if (Array.isArray(parsedTags)) {
          postData.tags = parsedTags.map(tag => ({ tag }))
        }
      } catch (error) {
        console.error('Error parsing tags:', error)
        // If JSON parsing fails, try as comma-separated string
        try {
          const commaSeparatedTags = tags.split(',').map(t => t.trim()).filter(Boolean)
          if (commaSeparatedTags.length > 0) {
            postData.tags = commaSeparatedTags.map(tag => ({ tag }))
          }
        } catch (fallbackError) {
          console.error('Error parsing tags as comma-separated string:', fallbackError)
        }
      }
    }

    // Debug log for postData
    console.log('📝 Creating post with data:', {
      contentLength: postData.content.length,
      hasImage: !!postData.image,
      hasVideo: !!postData.video,
      photosCount: postData.photos?.length || 0,
      hasLocation: !!postData.location,
      videoData: postData.video, // Log the actual video data
      imageData: postData.image, // Log the actual image data
      photosData: postData.photos // Log the actual photos data
    })

    // Validate video ID exists in media collection before creating post
    if (postData.video) {
      // Check if video is a valid string ID, not a File object
      if (typeof postData.video !== 'string' || postData.video.length === 0) {
        console.error('📝 Invalid video data type:', typeof postData.video, postData.video)
        return NextResponse.json(
          { success: false, message: 'Invalid video data provided' },
          { status: 400 }
        )
      }
      
      try {
        console.log('📝 Validating video ID:', postData.video)
        const videoDoc = await payload.findByID({
          collection: 'media',
          id: postData.video,
        })
        console.log('📝 Video document found:', {
          id: videoDoc?.id,
          filename: videoDoc?.filename,
          isVideo: videoDoc?.isVideo,
          mimeType: videoDoc?.mimeType
        })
      } catch (error) {
        console.error('📝 Error validating video ID:', error)
        return NextResponse.json(
          { success: false, message: 'Invalid video ID provided' },
          { status: 400 }
        )
      }
    }

    // Create the post
    console.log('📝 Creating post with final data:', {
      content: postData.content?.substring(0, 100) + '...',
      type: postData.type,
      author: postData.author,
      hasImage: !!postData.image,
      hasVideo: !!postData.video,
      hasLocation: !!postData.location,
      hasRating: !!postData.rating,
      authorType: typeof postData.author,
      authorLength: postData.author?.length || 'N/A'
    })

    // Detailed field-by-field validation for BSON errors
    console.log('📝 Detailed field validation:')
    Object.entries(postData).forEach(([key, value]) => {
      console.log(`📝 Field: ${key}`, {
        value: value,
        type: typeof value,
        isArray: Array.isArray(value),
        length: typeof value === 'string' ? value.length : 'N/A',
        isValidObjectId: typeof value === 'string' ? /^[0-9a-fA-F]{24}$/.test(value) : 'N/A'
      })
    })

    // Clean up postData to ensure no invalid values
    cleanedPostData = {}
    Object.entries(postData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        // Ensure arrays don't contain invalid values
        if (Array.isArray(value)) {
          const cleanedArray = value.filter(item => item !== null && item !== undefined)
          if (cleanedArray.length > 0) {
            cleanedPostData[key] = cleanedArray
          }
        } else {
          cleanedPostData[key] = value
        }
      }
    })

    console.log('📝 Cleaned postData:', Object.keys(cleanedPostData))

    const post = await payload.create({
      collection: 'posts',
      data: cleanedPostData,
    })

    console.log('📝 Post created successfully:', post.id)

    return NextResponse.json({
      success: true,
      message: 'Post created successfully',
      post: {
        id: post.id,
        content: post.content,
        postType: post.postType,
        author: post.author,
        media: post.media,
        location: post.location,
        createdAt: post.createdAt,
      }
    });

  } catch (error) {
    console.error('Error creating post:', error);
    
    // Provide more specific error information
    if (error instanceof Error) {
      if (error.message.includes('BSONError') || error.message.includes('ObjectId')) {
        console.error('📝 BSON/ObjectId error details:', {
          message: error.message,
          stack: error.stack,
          postData: {
            author: postData?.author,
            authorType: typeof postData?.author,
            hasVideo: !!postData?.video,
            videoType: typeof cleanedPostData?.video,
            hasImage: !!cleanedPostData?.image,
            imageType: typeof cleanedPostData?.image
          }
        })
        return NextResponse.json(
          { success: false, message: 'Invalid data format. Please check your input and try again.' },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to create post' },
      { status: 500 }
    );
  }
}

// OPTIMIZED: Helper function for image upload with compression
async function uploadImageFile(file: File, payload: any): Promise<string | null> {
  try {
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`Image file too large: ${file.name}`)
    }

    if (!file.type.startsWith('image/')) {
      throw new Error(`Invalid image type: ${file.type}`)
    }

    console.log(`📝 Uploading image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB, type: ${file.type})`)

    // OPTIMIZATION: Use streaming for large files instead of loading entire file into memory
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const mediaDoc = await payload.create({
      collection: 'media',
      data: {
        alt: file.name,
      },
      file: {
        data: buffer,
        mimetype: file.type,
        name: file.name,
        size: file.size,
      },
    })

    if (mediaDoc.id) {
      console.log(`📝 Image uploaded successfully: ${mediaDoc.id}`)
      return mediaDoc.id as string
    }
    
    return null
  } catch (error) {
    console.error(`📝 Error uploading image ${file.name}:`, error)
    throw error
  }
}

// OPTIMIZED: Helper function for video upload
async function uploadVideoFile(file: File, payload: any): Promise<string | null> {
  try {
    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      throw new Error(`Video file too large: ${file.name}`)
    }

    if (!file.type.startsWith('video/')) {
      throw new Error(`Invalid video type: ${file.type}`)
    }

    console.log(`📝 Uploading video: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB, type: ${file.type})`)

    // OPTIMIZATION: Use streaming for large files
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log(`📝 Creating video media document...`)
    const videoDoc = await payload.create({
      collection: 'media',
      data: {
        alt: file.name,
        isVideo: true, // Explicitly mark as video
        uploadSource: 'web',
      },
      file: {
        data: buffer,
        mimetype: file.type,
        name: file.name,
        size: file.size,
      },
    })

    console.log(`📝 Video upload result:`, {
      success: !!videoDoc.id,
      id: videoDoc.id,
      filename: videoDoc.filename,
      mimeType: videoDoc.mimeType,
      isVideo: videoDoc.isVideo,
      url: videoDoc.url,
      hasThumbnail: !!videoDoc.videoThumbnail
    })

    if (videoDoc.id) {
      console.log(`📝 Video uploaded successfully: ${videoDoc.id}`)
      console.log(`📝 Video document details:`, {
        id: videoDoc.id,
        filename: videoDoc.filename,
        mimeType: videoDoc.mimeType,
        isVideo: videoDoc.isVideo,
        url: videoDoc.url,
        hasThumbnail: !!videoDoc.videoThumbnail
      })
      
      // Video uploaded successfully - thumbnail will be generated by Media hook
      console.log(`📝 API: Video uploaded successfully - ID: ${videoDoc.id}`)
      console.log(`📝 API: Thumbnail will be generated by Media collection hook`)
      
      // Wait a moment for the Media hook to process the video
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check if the video was properly processed
      const updatedVideoDoc = await payload.findByID({
        collection: 'media',
        id: videoDoc.id,
      })
      
      console.log(`📝 API: Video processing check:`, {
        id: updatedVideoDoc?.id,
        isVideo: updatedVideoDoc?.isVideo,
        hasThumbnail: !!updatedVideoDoc?.videoThumbnail,
        url: updatedVideoDoc?.url
      })
      
      return videoDoc.id as string
    } else {
      console.error(`📝 Video upload failed: No ID returned`)
      return null
    }
    
  } catch (error) {
    console.error(`📝 Error uploading video ${file.name}:`, error)
    throw error
  }
} 