#!/usr/bin/env node

/**
 * Debug Post Data Structure
 * Run with: node scripts/debug-post-data.mjs
 */

console.log('🔍 Debugging Post Data Structure...')

// Sample post data that might be causing issues
const samplePostData = [
  {
    id: '1',
    title: 'Test Post',
    content: 'This is a test',
    image: null,
    video: null,
    photos: [],
    media: [],
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Post with Image',
    content: 'This has an image',
    image: {
      id: 'img123',
      url: '/api/media/file/test.jpg',
      filename: 'test.jpg'
    },
    video: null,
    photos: [],
    media: [],
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Post with Video',
    content: 'This has a video',
    image: null,
    video: {
      id: 'vid123',
      url: '/api/media/file/test.mp4',
      filename: 'test.mp4',
      isVideo: true
    },
    photos: [],
    media: [],
    createdAt: new Date().toISOString()
  }
]

console.log('\n📋 Expected Post Structure:')
samplePostData.forEach((post, index) => {
  console.log(`\nPost ${index + 1}:`)
  console.log('  ID:', post.id)
  console.log('  Image:', post.image)
  console.log('  Video:', post.video)
  console.log('  Photos:', post.photos)
  console.log('  Media:', post.media)
})

console.log('\n🔧 Common Issues:')
console.log('1. Posts with null/undefined image/video fields')
console.log('2. Posts with empty media arrays')
console.log('3. Posts with malformed media objects')
console.log('4. Posts missing required URL properties')

console.log('\n🎯 Debug Steps:')
console.log('1. Check browser console for detailed post data')
console.log('2. Look for getPostMedia input logs')
console.log('3. Check getPrimaryDisplayUrl logs')
console.log('4. Verify image/video field types')

console.log('\n✅ Debug script complete!')
console.log('Check the browser console for actual post data structure.') 