import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Post creation API called')
    console.log('📝 Request headers:', Object.fromEntries(request.headers.entries()))
    console.log('📝 Request method:', request.method)
    console.log('📝 Content-Type:', request.headers.get('content-type'))
    
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
    const mediaIds: string[] = []

    // Upload images
    for (const file of imageFiles) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        return NextResponse.json(
          { success: false, message: `Image file too large: ${file.name}` },
          { status: 400 }
        )
      }

      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { success: false, message: `Invalid image type: ${file.type}` },
          { status: 400 }
        )
      }

      try {
        const mediaDoc = await payload.create({
          collection: 'media',
          data: {
            alt: file.name,
          },
          file: {
            data: Buffer.from(await file.arrayBuffer()),
            mimetype: file.type,
            name: file.name,
            size: file.size,
          },
        })

        if (mediaDoc.id) {
          mediaIds.push(mediaDoc.id as string)
        }
      } catch (error) {
        console.error('Error uploading image:', error)
        return NextResponse.json(
          { success: false, message: `Failed to upload image: ${file.name}` },
          { status: 500 }
        )
      }
    }

    // Upload videos
    for (const file of videoFiles) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        return NextResponse.json(
          { success: false, message: `Video file too large: ${file.name}` },
          { status: 400 }
        )
      }

      if (!file.type.startsWith('video/')) {
        return NextResponse.json(
          { success: false, message: `Invalid video type: ${file.type}` },
          { status: 400 }
        )
      }

      try {
        const videoDoc = await payload.create({
          collection: 'media',
          data: {
            alt: file.name,
          },
          file: {
            data: Buffer.from(await file.arrayBuffer()),
            mimetype: file.type,
            name: file.name,
            size: file.size,
          },
        })

        if (videoDoc.id) {
          mediaIds.push(videoDoc.id as string)
        }
      } catch (error) {
        console.error('Error uploading video:', error)
        return NextResponse.json(
          { success: false, message: `Failed to upload video: ${file.name}` },
          { status: 500 }
        )
      }
    }

    // Prepare post data
    const postData: any = {
      content: content.trim(),
      type: type, // Use the type from form data
      author: userId,
      status: 'published', // Set status to published
      visibility: 'public', // Set visibility to public
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
      // This will be handled by the frontend to create a location later
      postData.location = locationName.trim()
    }

    // Add media if any - properly handle both images and videos
    if (mediaIds.length > 0) {
      // Separate images and videos based on the files we processed
      const imageIds: string[] = []
      const videoIds: string[] = []
      
      // We need to track which media IDs correspond to images vs videos
      // Since we processed images first, then videos, we can use the counts
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
    console.log('📝 postData to be created:', postData)

    // Create the post
    const post = await payload.create({
      collection: 'posts',
      data: postData,
    })

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