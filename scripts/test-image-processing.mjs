#!/usr/bin/env node

/**
 * Test Image Processing
 * Run with: node scripts/test-image-processing.mjs
 */

console.log('🔍 Testing Image Processing...')

// Sample post data to test image processing
const testPosts = [
  {
    id: '1',
    title: 'Post with Image Only',
    content: 'This post has only an image',
    image: {
      id: 'img123',
      url: '/api/media/file/test-image.jpg',
      filename: 'test-image.jpg'
    },
    video: null,
    photos: [],
    media: []
  },
  {
    id: '2',
    title: 'Post with Video Only',
    content: 'This post has only a video',
    image: null,
    video: {
      id: 'vid123',
      url: '/api/media/file/test-video.mp4',
      filename: 'test-video.mp4',
      isVideo: true
    },
    photos: [],
    media: []
  },
  {
    id: '3',
    title: 'Post with Both Image and Video',
    content: 'This post has both image and video',
    image: {
      id: 'img456',
      url: '/api/media/file/test-image-2.jpg',
      filename: 'test-image-2.jpg'
    },
    video: {
      id: 'vid456',
      url: '/api/media/file/test-video-2.mp4',
      filename: 'test-video-2.mp4',
      isVideo: true
    },
    photos: [],
    media: []
  },
  {
    id: '4',
    title: 'Post with No Media',
    content: 'This post has no media',
    image: null,
    video: null,
    photos: [],
    media: []
  }
]

console.log('\n📋 Test Posts:')
testPosts.forEach((post, index) => {
  console.log(`\nPost ${index + 1}: ${post.title}`)
  console.log('  ID:', post.id)
  console.log('  Has Image:', !!post.image)
  console.log('  Has Video:', !!post.video)
  console.log('  Image URL:', post.image?.url || 'null')
  console.log('  Video URL:', post.video?.url || 'null')
})

console.log('\n🎯 Expected Behavior:')
console.log('1. Posts with images should show image URLs')
console.log('2. Posts with videos should show video URLs')
console.log('3. Posts with both should show both')
console.log('4. Posts with no media should show placeholders')

console.log('\n🔧 Key Fix:')
console.log('- Images should be processed regardless of video presence')
console.log('- getPostMedia should add images even when videos exist')
console.log('- URL processing should handle both string and object formats')

console.log('\n✅ Test script complete!')
console.log('Check the browser console for actual processing results.') 