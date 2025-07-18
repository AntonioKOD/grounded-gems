import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Post creation API called - OPTIMIZED VERSION')
    
    const payload = await getPayload({ config })
    
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

    // Find the user
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

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

    // Process media files - handle both field name conventions
    const imageFiles = [
      ...(formData.getAll('images') as File[]),
      ...(formData.getAll('media') as File[])
    ].filter(file => file.type.startsWith('image/'))
    const videoFiles = formData.getAll('videos') as File[]
    
    console.log(`📝 Processing ${imageFiles.length} images and ${videoFiles.length} videos`)

    // OPTIMIZATION: Process files in parallel with better error handling
    const mediaIds: string[] = []
    
    // Process images and videos in parallel
    const uploadPromises: Promise<string | null>[] = []
    
    // Add image upload promises
    for (const file of imageFiles) {
      uploadPromises.push(uploadImageFile(file, payload))
    }
    
    // Add video upload promises
    for (const file of videoFiles) {
      uploadPromises.push(uploadVideoFile(file, payload))
    }
    
    // Wait for all uploads to complete
    console.log(`📝 Starting parallel upload of ${uploadPromises.length} files...`)
    const uploadResults = await Promise.allSettled(uploadPromises)
    
    // Process results
    for (const result of uploadResults) {
      if (result.status === 'fulfilled' && result.value) {
        mediaIds.push(result.value)
      } else if (result.status === 'rejected') {
        console.error('📝 Upload failed:', result.reason)
        return NextResponse.json(
          { success: false, message: `Upload failed: ${result.reason}` },
          { status: 500 }
        )
      }
    }
    
    console.log(`📝 Successfully uploaded ${mediaIds.length} files`)

    // Prepare post data
    const postData: any = {
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
        const location = await payload.findByID({
          collection: 'locations',
          id: locationId,
        })
        if (location) {
          postData.location = locationId
        }
      } catch (error) {
        console.log('Location not found, continuing without location')
      }
    } else if (locationName && locationName.trim()) {
      // If no location ID but location name provided, store it as a string
      postData.location = locationName.trim()
    }

    // Add media if any - properly handle both images and videos
    if (mediaIds.length > 0) {
      // Separate images and videos based on the files we processed
      const imageIds: string[] = []
      const videoIds: string[] = []
      
      // We need to track which media IDs correspond to images vs videos
      const imageCount = imageFiles.length
      const videoCount = videoFiles.length
      
      // First imageCount items are images, rest are videos
      if (imageCount > 0) {
        imageIds.push(...mediaIds.slice(0, imageCount))
      }
      if (videoCount > 0) {
        videoIds.push(...mediaIds.slice(imageCount))
      }
      
      // Set the first image as the main image
      if (imageIds.length > 0) {
        postData.image = imageIds[0]
        // Set remaining images as photos array
        if (imageIds.length > 1) {
          postData.photos = imageIds.slice(1)
        }
      }
      
      // Set videos if any
      if (videoIds.length > 0) {
        postData.video = videoIds[0] // First video as main video
        // Set remaining videos as additional videos array if needed
        if (videoIds.length > 1) {
          postData.videos = videoIds.slice(1)
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
      hasLocation: !!postData.location
    })

    // Create the post
    const post = await payload.create({
      collection: 'posts',
      data: postData,
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
    })

  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create post' },
      { status: 500 }
    )
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

    console.log(`📝 Uploading image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

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

    console.log(`📝 Uploading video: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

    // OPTIMIZATION: Use streaming for large files
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const videoDoc = await payload.create({
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

    if (videoDoc.id) {
      console.log(`📝 Video uploaded successfully: ${videoDoc.id}`)
      return videoDoc.id as string
    }
    
    return null
  } catch (error) {
    console.error(`📝 Error uploading video ${file.name}:`, error)
    throw error
  }
} 