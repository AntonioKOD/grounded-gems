#!/usr/bin/env node

/**
 * Simple video upload test
 * Run with: node scripts/test-video-upload-simple.mjs
 */

import { getPayload } from 'payload'
import config from '@payload-config'

async function testVideoUpload() {
  console.log('🎬 Starting simple video upload test...')
  
  try {
    const payload = await getPayload({ config })
    
    // Create a simple test video file (mock)
    const testVideoData = {
      filename: 'test-video.mp4',
      mimeType: 'video/mp4',
      size: 1024 * 1024, // 1MB
      isVideo: true,
      alt: 'Test video',
      uploadSource: 'test'
    }
    
    console.log('📝 Creating test video document...')
    
    // Try to create a video document directly
    const videoDoc = await payload.create({
      collection: 'media',
      data: {
        alt: testVideoData.alt,
        isVideo: true,
        uploadSource: 'test',
      },
      file: {
        data: Buffer.from('fake video data'),
        mimetype: 'video/mp4',
        name: 'test-video.mp4',
        size: 1024 * 1024,
      },
    })
    
    console.log('📝 Video document created:', {
      id: videoDoc.id,
      filename: videoDoc.filename,
      mimeType: videoDoc.mimeType,
      isVideo: videoDoc.isVideo,
      url: videoDoc.url
    })
    
    // Now try to create a post with this video
    console.log('📝 Creating test post with video...')
    
    const postData = {
      content: 'Test post with video',
      type: 'post',
      author: 'test-user-id', // This will fail, but let's see the validation error
      video: videoDoc.id,
      status: 'published',
      visibility: 'public'
    }
    
    console.log('📝 Post data:', postData)
    
    try {
      const post = await payload.create({
        collection: 'posts',
        data: postData,
      })
      
      console.log('📝 Post created successfully:', post.id)
    } catch (postError) {
      console.error('📝 Post creation failed:', postError.message)
      console.error('📝 Post error details:', {
        name: postError.name,
        status: postError.status,
        data: postError.data
      })
    }
    
    // Clean up
    console.log('📝 Cleaning up test video...')
    await payload.delete({
      collection: 'media',
      id: videoDoc.id,
    })
    
    console.log('✅ Video upload test completed')
    
  } catch (error) {
    console.error('❌ Error in video upload test:', error)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
  }
}

// Run the test
testVideoUpload()
  .then(() => {
    console.log('✅ Test completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }) 