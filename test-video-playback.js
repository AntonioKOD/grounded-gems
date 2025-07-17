import { getPayload } from 'payload'
import config from './payload.config.ts'
import { getVideoUrl } from './lib/image-utils.ts'

async function testVideoPlayback() {
  try {
    console.log('🔍 Testing video playback in database...')
    
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
      
      // Test video URL processing
      const videoUrl = getVideoUrl(post.video)
      console.log('  Processed video URL:', videoUrl)
      
      if (videoUrl) {
        // Test if URL is accessible
        console.log('  ✅ Video URL processed successfully')
        
        // Check if it's a valid video URL
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']
        const isVideoFile = videoExtensions.some(ext => videoUrl.toLowerCase().includes(ext))
        const isVideoUrl = videoUrl.includes('/api/media/file/') || isVideoFile
        
        if (isVideoFile) {
          console.log('  ✅ Valid video file extension detected')
        } else if (isVideoUrl) {
          console.log('  ✅ Valid video API URL detected')
        } else {
          console.log('  ⚠️  URL format not recognized as video')
        }
      } else {
        console.log('  ❌ Failed to process video URL')
      }
    })
    
    // Test the feed API
    console.log('\n🌐 Testing feed API...')
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const feedUrl = `${baseUrl}/api/mobile/posts/feed?page=1&limit=5&includeTypes=post`
    
    console.log('  Feed URL:', feedUrl)
    
    try {
      const response = await fetch(feedUrl)
      if (response.ok) {
        const data = await response.json()
        console.log('  ✅ Feed API responded successfully')
        
        const postsWithVideos = data.data?.posts?.filter(post => 
          post.media?.some(media => media.type === 'video')
        ) || []
        
        console.log(`  📹 Found ${postsWithVideos.length} posts with videos in feed`)
        
        postsWithVideos.forEach((post, index) => {
          console.log(`    Post ${index + 1}:`)
          console.log(`      ID: ${post.id}`)
          console.log(`      Media count: ${post.media.length}`)
          post.media.forEach((media, mediaIndex) => {
            if (media.type === 'video') {
              console.log(`      Video ${mediaIndex + 1}: ${media.url}`)
              console.log(`      Thumbnail: ${media.thumbnail}`)
            }
          })
        })
      } else {
        console.log('  ❌ Feed API failed:', response.status, response.statusText)
      }
    } catch (error) {
      console.log('  ❌ Feed API error:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testVideoPlayback() 