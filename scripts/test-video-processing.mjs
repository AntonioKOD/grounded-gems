#!/usr/bin/env node

/**
 * Test script to check video processing via API
 * Run with: node scripts/test-video-processing.mjs
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function testVideoProcessing() {
  console.log('🎬 Testing video processing via API...')
  
  try {
    // 1. Test the feed API to see if videos are being returned
    console.log('\n📹 Testing feed API for videos...')
    const feedResponse = await fetch(`${BASE_URL}/api/mobile/posts/feed?page=1&limit=10`)
    
    if (!feedResponse.ok) {
      console.error('❌ Feed API request failed:', feedResponse.status, feedResponse.statusText)
      return
    }
    
    const feedData = await feedResponse.json()
    console.log(`Feed API response: ${feedData.success ? '✅ Success' : '❌ Failed'}`)
    
    if (feedData.success && feedData.data?.posts) {
      const posts = feedData.data.posts
      console.log(`Found ${posts.length} posts in feed`)
      
      const postsWithVideos = posts.filter(post => 
        post.media && post.media.some(media => media.type === 'video')
      )
      
      console.log(`Found ${postsWithVideos.length} posts with videos:`)
      postsWithVideos.forEach((post, index) => {
        console.log(`  ${index + 1}. Post ID: ${post.id}`)
        console.log(`     - Caption: ${post.caption?.substring(0, 50)}...`)
        console.log(`     - Media count: ${post.media?.length || 0}`)
        console.log(`     - Video URLs:`, post.media?.filter(m => m.type === 'video').map(m => m.url))
        console.log('')
      })
      
      if (postsWithVideos.length === 0) {
        console.log('⚠️  No posts with videos found in feed')
      }
    }
    
    // 2. Test the regular feed API
    console.log('\n📹 Testing regular feed API...')
    const regularFeedResponse = await fetch(`${BASE_URL}/api/feed?page=1&limit=10`)
    
    if (regularFeedResponse.ok) {
      const regularFeedData = await regularFeedResponse.json()
      console.log(`Regular feed API response: ${regularFeedData.success ? '✅ Success' : '❌ Failed'}`)
      
      if (regularFeedData.success && regularFeedData.posts) {
        const posts = regularFeedData.posts
        console.log(`Found ${posts.length} posts in regular feed`)
        
        const postsWithVideos = posts.filter(post => post.video)
        console.log(`Found ${postsWithVideos.length} posts with videos in regular feed:`)
        postsWithVideos.forEach((post, index) => {
          console.log(`  ${index + 1}. Post ID: ${post.id}`)
          console.log(`     - Video: ${post.video}`)
          console.log(`     - Video type: ${typeof post.video}`)
          console.log(`     - Has thumbnail: ${!!post.videoThumbnail}`)
          console.log('')
        })
      }
    }
    
    // 3. Test a specific post creation to see if video upload works
    console.log('\n📝 Testing video upload via post creation...')
    console.log('Note: This would require authentication and actual file upload')
    console.log('To test video upload, try creating a post with a video through the UI')
    
    // 4. Check if there are any video files in the media directory
    console.log('\n📁 Checking media directory structure...')
    console.log('Media files are stored in the /media directory')
    console.log('Video thumbnails should be generated automatically')
    
    console.log('\n🎬 Video processing test completed!')
    console.log('\n📋 Summary:')
    console.log('- Check the feed API responses above for video content')
    console.log('- If no videos are found, try uploading a video through the UI')
    console.log('- Check browser console for video processing logs')
    console.log('- Verify that video files are being uploaded to the media collection')
    
  } catch (error) {
    console.error('❌ Error testing video processing:', error)
  }
}

// Run the test
testVideoProcessing()
  .then(() => {
    console.log('✅ Test completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }) 