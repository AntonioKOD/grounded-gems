// Simple test script to test the post creation API with JSON
import fetch from 'node-fetch'

async function testPostCreationAPI() {
  try {
    console.log('🧪 Testing post creation API with JSON...')
    
    // Use a real user ID from the database
    const userId = '681bce3b917cb5806f5bb9d7' // Antonio Kodheli's user ID
    
    // Create JSON payload
    const payload = {
      content: 'This is a test post from the JSON API test script!',
      type: 'post',
      title: 'Test JSON Post',
      tags: ['test', 'json', 'api']
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
      console.log('✅ Post creation API test passed!')
      console.log('✅ Created post ID:', result.post?.id)
    } else {
      console.log('❌ Post creation API test failed!')
      console.log('Error:', result.message)
    }
    
  } catch (error) {
    console.error('❌ Error testing post creation API:', error)
  }
}

testPostCreationAPI() 