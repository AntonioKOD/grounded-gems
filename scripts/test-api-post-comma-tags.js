// Test script to test post creation with comma-separated tags
import fetch from 'node-fetch'

async function testPostCreationWithCommaTags() {
  try {
    console.log('🧪 Testing post creation API with comma-separated tags...')
    
    // Use a real user ID from the database
    const userId = '681bce3b917cb5806f5bb9d7' // Antonio Kodheli's user ID
    
    // Create JSON payload with comma-separated tags
    const payload = {
      content: 'This is a test post with comma-separated tags!',
      type: 'post',
      title: 'Test Comma Tags Post',
      tags: 'test, comma, separated, tags' // Comma-separated string instead of array
    }
    
    console.log('📤 Sending JSON request to /api/posts/create...')
    console.log('📤 Payload:', payload)
    
    // Make the request
    const response = await fetch('http://localhost:3000/api/posts/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify(payload)
    })
    
    const result = await response.json()
    
    console.log('📥 Response status:', response.status)
    console.log('📥 Response body:', result)
    
    if (response.ok && result.success) {
      console.log('✅ Post creation with comma-separated tags test passed!')
      console.log('✅ Created post ID:', result.post?.id)
    } else {
      console.log('❌ Post creation with comma-separated tags test failed!')
      console.log('Error:', result.message)
    }
    
  } catch (error) {
    console.error('❌ Error testing post creation API:', error)
  }
}

testPostCreationWithCommaTags() 