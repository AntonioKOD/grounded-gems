#!/usr/bin/env node

/**
 * Test Profile Posts Data Structure
 * Run with: node scripts/test-profile-posts.mjs
 */

console.log('🔍 Testing Profile Posts Data Structure...')

// Sample post data structure that might be causing issues
const samplePosts = [
  {
    id: '1',
    title: 'Test Post 1',
    content: 'This is a test post',
    image: null, // This would cause issues
    video: null, // This would cause issues
    photos: [], // Empty array
    media: [], // Empty array
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Test Post 2',
    content: 'This is another test post',
    image: {
      id: 'img123',
      url: '/api/media/file/test-image.jpg',
      filename: 'test-image.jpg'
    },
    video: null,
    photos: [],
    media: [],
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Test Post 3',
    content: 'This is a video post',
    image: null,
    video: {
      id: 'vid123',
      url: '/api/media/file/test-video.mp4',
      filename: 'test-video.mp4',
      isVideo: true
    },
    photos: [],
    media: [],
    createdAt: new Date().toISOString()
  }
]

console.log('\n📋 Sample Posts Data:')
samplePosts.forEach((post, index) => {
  console.log(`\nPost ${index + 1}:`)
  console.log('  ID:', post.id)
  console.log('  Title:', post.title)
  console.log('  Image:', post.image)
  console.log('  Video:', post.video)
  console.log('  Photos:', post.photos)
  console.log('  Media:', post.media)
})

console.log('\n🔧 Expected Issues:')
console.log('1. Posts with null/undefined image/video fields')
console.log('2. Posts with empty media arrays')
console.log('3. Posts with malformed media objects')
console.log('4. Posts missing required URL properties')

console.log('\n✅ Test script complete!')
console.log('Check the browser console for actual post data structure.') 