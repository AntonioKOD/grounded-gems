const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Test multiple Live Photos upload through post creation API
async function testMultipleLivePhotos() {
  console.log('🧪 Testing Multiple Live Photos Upload...\n');
  
  // Create test HEIC files (simulating Live Photos)
  const testFiles = [];
  const mediaDir = path.join(process.cwd(), 'media');
  
  // Create 3 test HEIC files
  for (let i = 1; i <= 3; i++) {
    const testFileName = `test-live-photo-${i}.heic`;
    const testFilePath = path.join(mediaDir, testFileName);
    
    // Create a dummy HEIC file (just for testing)
    const dummyContent = `# HEIC file ${i} - Live Photo test`;
    fs.writeFileSync(testFilePath, dummyContent);
    testFiles.push(testFilePath);
    
    console.log(`📱 Created test Live Photo ${i}: ${testFileName}`);
  }
  
  try {
    // Test post creation with multiple Live Photos
    const formData = new FormData();
    
    // Add post content
    formData.append('content', 'Testing multiple Live Photos upload');
    formData.append('type', 'post');
    
    // Add multiple Live Photos
    testFiles.forEach((filePath, index) => {
      const fileName = path.basename(filePath);
      const fileStream = fs.createReadStream(filePath);
      formData.append('images', fileStream, {
        filename: fileName,
        contentType: 'image/heic'
      });
      console.log(`📝 Added Live Photo ${index + 1} to form data`);
    });
    
    console.log('\n📤 Uploading multiple Live Photos...');
    
    // Make the request to the post creation API
    const response = await fetch('http://localhost:3000/api/posts/create', {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
        'Cookie': 'payload-token=your-auth-token-here' // Replace with actual auth token
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Multiple Live Photos uploaded successfully!');
      console.log('📊 Post details:', {
        id: result.post.id,
        content: result.post.content,
        hasImage: !!result.post.image,
        photosCount: result.post.photos?.length || 0
      });
      
      // Check if all Live Photos were processed
      if (result.post.image && result.post.photos && result.post.photos.length >= 2) {
        console.log('✅ All Live Photos were properly assigned to post!');
        console.log(`📸 Main image: ${result.post.image}`);
        console.log(`📸 Additional photos: ${result.post.photos.length} photos`);
      } else {
        console.log('⚠️ Some Live Photos may not have been processed correctly');
      }
    } else {
      console.error('❌ Upload failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Clean up test files
    testFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🧹 Cleaned up: ${path.basename(filePath)}`);
      }
    });
  }
}

// Instructions for running the test
console.log(`
🧪 MULTIPLE LIVE PHOTOS TEST
============================

This test verifies that multiple Live Photos can be uploaded and converted correctly.

PREREQUISITES:
1. Make sure your server is running on localhost:3000
2. Replace 'your-auth-token-here' with a valid authentication token
3. Ensure the Media collection has the Live Photo conversion logic enabled

TEST STEPS:
1. The script creates 3 dummy HEIC files to simulate Live Photos
2. Uploads them through the post creation API
3. Verifies that all files are processed and assigned correctly
4. Cleans up test files

EXPECTED BEHAVIOR:
- All 3 Live Photos should be uploaded sequentially
- Each should be converted to JPEG in the Media collection
- The post should have 1 main image and 2 additional photos
- No conflicts or race conditions should occur

To run this test:
node test-multiple-live-photos-fixed.js
`);

// Run the test if this file is executed directly
if (require.main === module) {
  testMultipleLivePhotos();
}

module.exports = { testMultipleLivePhotos }; 