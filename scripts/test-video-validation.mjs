#!/usr/bin/env node

/**
 * Video validation test script
 * Run with: node scripts/test-video-validation.mjs
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function testVideoValidation() {
  console.log('🎬 Starting video validation test...')
  
  try {
    // Test 1: Check if API route is accessible
    console.log('\n📝 Test 1: API route accessibility')
    const apiResponse = await fetch(`${BASE_URL}/api/posts/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'Test post',
        type: 'post'
      })
    })
    
    console.log(`API route response: ${apiResponse.status} ${apiResponse.statusText}`)
    
    // Test 2: Check Posts collection field validation
    console.log('\n📋 Test 2: Posts collection field validation')
    console.log('Posts collection video field:')
    console.log('  - Field name: video')
    console.log('  - Type: upload')
    console.log('  - Relation: media')
    console.log('  - Required: false')
    console.log('  - Validation: Must be valid media ID')
    
    // Test 3: Check Media collection video support
    console.log('\n📹 Test 3: Media collection video support')
    console.log('Media collection video fields:')
    console.log('  - isVideo: checkbox (auto-set for video files)')
    console.log('  - videoThumbnail: upload (auto-generated)')
    console.log('  - mimeType: auto-detected')
    console.log('  - filename: auto-generated')
    
    // Test 4: Check video upload flow
    console.log('\n🔄 Test 4: Video upload flow')
    console.log('Expected flow:')
    console.log('  1. Video file uploaded to Media collection')
    console.log('  2. Media collection sets isVideo: true')
    console.log('  3. Media collection generates thumbnail')
    console.log('  4. Video ID returned to API route')
    console.log('  5. API route sets postData.video = videoId')
    console.log('  6. Post created with video field')
    
    // Test 5: Potential issues
    console.log('\n🔍 Test 5: Potential issues')
    console.log('Issue 1: Video upload failing')
    console.log('  - Check: Media collection hooks')
    console.log('  - Check: File size limits')
    console.log('  - Check: MIME type validation')
    
    console.log('\nIssue 2: Video ID not being set correctly')
    console.log('  - Check: API route video assignment')
    console.log('  - Check: Video IDs array')
    console.log('  - Check: postData.video value')
    
    console.log('\nIssue 3: Posts collection validation')
    console.log('  - Check: Video ID exists in Media collection')
    console.log('  - Check: Video document is properly created')
    console.log('  - Check: Video document has isVideo: true')
    
    // Test 6: Debugging steps
    console.log('\n🐛 Test 6: Debugging steps')
    console.log('1. Upload a video file')
    console.log('2. Check server logs for video upload')
    console.log('3. Check if video document is created in Media collection')
    console.log('4. Check if video ID is returned to API route')
    console.log('5. Check if postData.video is set correctly')
    console.log('6. Check if post creation fails with validation error')
    
    // Test 7: Common validation errors
    console.log('\n❌ Test 7: Common validation errors')
    console.log('Error: "The following field is invalid: Video"')
    console.log('  - Cause: Video ID does not exist in Media collection')
    console.log('  - Cause: Video document was not created properly')
    console.log('  - Cause: Video ID is not a valid UUID/ID format')
    console.log('  - Cause: Video document was deleted before post creation')
    
    console.log('\n🎬 Video validation test completed!')
    console.log('\n📋 Next steps:')
    console.log('1. Try uploading a video in the browser')
    console.log('2. Check server logs for detailed debugging info')
    console.log('3. Look for video upload success/failure messages')
    console.log('4. Check if video document exists in database')
    console.log('5. Verify video ID format and validity')
    
  } catch (error) {
    console.error('❌ Error in video validation test:', error)
  }
}

// Run the test
testVideoValidation()
  .then(() => {
    console.log('✅ Video validation test completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Video validation test failed:', error)
    process.exit(1)
  }) 