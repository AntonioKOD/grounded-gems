/**
 * Mobile Post Creation API Test Script
 * 
 * This script demonstrates how to use the mobile post creation endpoint.
 * 
 * Usage:
 * node test-mobile-post-creation.js
 * 
 * Prerequisites:
 * - You need a valid JWT token from the mobile auth endpoint
 * - Replace YOUR_JWT_TOKEN with an actual token
 * - Ensure the server is running on localhost:3000
 */

const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api/v1/mobile';
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token

// Test data
const postData = {
  content: 'Testing mobile post creation with media!',
  title: 'Mobile Test Post',
  type: 'post',
  locationName: 'Test Location',
  tags: ['mobile', 'test', 'api']
};

async function testPostCreation() {
  try {
    console.log('🧪 Testing Mobile Post Creation API...\n');

    // Create FormData
    const formData = new FormData();
    
    // Add post data
    formData.append('content', postData.content);
    formData.append('title', postData.title);
    formData.append('type', postData.type);
    formData.append('locationName', postData.locationName);
    
    // Add tags (use tags[] format for arrays)
    postData.tags.forEach(tag => {
      formData.append('tags[]', tag);
    });

    // Add test image (if exists)
    if (fs.existsSync('./test-image.jpg')) {
      const imageBuffer = fs.readFileSync('./test-image.jpg');
      formData.append('media', imageBuffer, {
        filename: 'test-image.jpg',
        contentType: 'image/jpeg'
      });
      console.log('📷 Added test image');
    } else {
      console.log('⚠️  No test image found (test-image.jpg)');
    }

    // Make API request
    console.log('📤 Sending POST request to:', `${API_BASE_URL}/posts`);
    
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    const result = await response.json();

    console.log('\n📥 Response Status:', response.status);
    console.log('📄 Response Body:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Post created successfully!');
      console.log('📍 Post ID:', result.data.id);
      console.log('👤 Author:', result.data.author.name);
      console.log('📝 Content:', result.data.content);
      console.log('🏷️  Tags:', result.data.tags);
      console.log('🖼️  Media Count:', result.data.media?.length || 0);
    } else {
      console.log('\n❌ Post creation failed!');
      console.log('Error:', result.message);
      console.log('Code:', result.code);
    }

  } catch (error) {
    console.error('\n💥 Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function testGetPosts() {
  try {
    console.log('\n🧪 Testing Mobile Posts Feed API...\n');

    const response = await fetch(`${API_BASE_URL}/posts?page=1&limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    console.log('📥 Feed Response Status:', response.status);
    console.log('📄 Posts Count:', result.data?.posts?.length || 0);
    console.log('📊 Pagination:', result.data?.pagination);

    if (result.success && result.data.posts.length > 0) {
      console.log('\n📋 Sample Post:');
      const samplePost = result.data.posts[0];
      console.log('- ID:', samplePost.id);
      console.log('- Content:', samplePost.content?.substring(0, 100) + '...');
      console.log('- Author:', samplePost.author.name);
      console.log('- Media:', samplePost.media?.length || 0, 'items');
    }

  } catch (error) {
    console.error('\n💥 Feed test failed:', error.message);
  }
}

// Main execution
async function runTests() {
  if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.log('❌ Please set a valid JWT_TOKEN in the script');
    console.log('You can get a token by calling the login endpoint:');
    console.log(`POST ${API_BASE_URL}/auth/login`);
    console.log('Body: { "email": "your@email.com", "password": "your_password" }');
    return;
  }

  // Test post creation
  await testPostCreation();
  
  // Test getting posts
  await testGetPosts();
}

// Run the tests
runTests().catch(console.error);

// Export for module usage
module.exports = {
  testPostCreation,
  testGetPosts,
  API_BASE_URL
}; 