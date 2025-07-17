import { getPayload } from 'payload'
import config from './payload.config.ts'
import { getVideoUrl } from './lib/image-utils.ts'

async function testVideoData() {
  try {
    console.log('🔍 Testing video data in database...')
    
    const payload = await getPayload({ config })
    
    // Find posts with videos
    const postsWithVideos = await payload.find({
      collection: 'posts',
      where: {
        video: { exists: true }
      },
      depth: 2,
      limit: 5
    })
    
    console.log(`📹 Found ${postsWithVideos.docs.length} posts with videos`)
    
    postsWithVideos.docs.forEach((post, index) => {
      console.log(`\n📝 Post ${index + 1} (ID: ${post.id}):`)
      console.log('  Content:', post.content?.substring(0, 100) + '...')
      console.log('  Video field type:', typeof post.video)
      console.log('  Video field value:', post.video)
      
      if (typeof post.video === 'object' && post.video !== null) {
        console.log('  Video object keys:', Object.keys(post.video))
        console.log('  Video URL:', post.video.url)
        console.log('  Video filename:', post.video.filename)
        console.log('  Video sizes:', post.video.sizes ? Object.keys(post.video.sizes) : 'No sizes')
      }
      
      // Test URL processing
      const processedUrl = getVideoUrl(post.video)
      console.log('  Processed video URL:', processedUrl)
    })
    
    // Also check for any posts with media arrays
    const postsWithMedia = await payload.find({
      collection: 'posts',
      where: {
        media: { exists: true }
      },
      depth: 2,
      limit: 3
    })
    
    console.log(`\n📦 Found ${postsWithMedia.docs.length} posts with media arrays`)
    
    postsWithMedia.docs.forEach((post, index) => {
      console.log(`\n📝 Post with media ${index + 1} (ID: ${post.id}):`)
      console.log('  Media array:', post.media)
    })
    
  } catch (error) {
    console.error('❌ Error testing video data:', error)
  }
}

testVideoData() 