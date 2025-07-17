import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const formData = await request.formData()
    
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
    const postType = formData.get('postType') as string || 'general'
    const locationId = formData.get('locationId') as string
    const tags = formData.get('tags') as string
    const isPublic = formData.get('isPublic') === 'true'
    const allowComments = formData.get('allowComments') !== 'false'

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Content is required' },
        { status: 400 }
      )
    }

    // Process media files
    const imageFiles = formData.getAll('images') as File[]
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
      type: 'post', // required by schema
      author: userId,
      isPublic,
      allowComments,
      shareCount: 0,
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
    }

    // Add media if any
    if (mediaIds.length > 0) {
      postData.media = mediaIds
    }

    // Add tags if provided
    if (tags) {
      try {
        const parsedTags = JSON.parse(tags)
        if (Array.isArray(parsedTags)) {
          postData.tags = parsedTags
        }
      } catch (error) {
        console.error('Error parsing tags:', error)
      }
    }

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