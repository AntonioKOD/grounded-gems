// Simple test script to test the post creation API
import fs from 'fs'
import path from 'path'
import FormData from 'form-data'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create a simple test image file
const createTestImage = () => {
  // Create a minimal PNG file (1x1 pixel, transparent)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    0x1F, 0x15, 0xC4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
    0xE2, 0x21, 0xBC, 0x33, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ])
  
  const testImagePath = path.join(__dirname, 'test-image.png')
  fs.writeFileSync(testImagePath, pngData)
  return testImagePath
}

async function testPostCreationAPI() {
  try {
    console.log('🧪 Testing post creation API...')
    
    // Use a real user ID from the database
    const userId = '681bce3b917cb5806f5bb9d7' // Antonio Kodheli's user ID
    
    // Create test image
    const testImagePath = createTestImage()
    const testImageBuffer = fs.readFileSync(testImagePath)
    
    // Create FormData
    const formData = new FormData()
    
    formData.append('content', 'This is a test post from the API test script!')
    formData.append('type', 'post')
    formData.append('title', 'Test Post')
    formData.append('tags[]', 'test')
    formData.append('tags[]', 'api')
    
    // Add the test image
    formData.append('images', testImageBuffer, {
      filename: 'test-image.png',
      contentType: 'image/png'
    })
    
    console.log('📤 Sending request to /api/posts/create...')
    
    // Make the request
    const response = await fetch('http://localhost:3000/api/posts/create', {
      method: 'POST',
      headers: {
        'x-user-id': userId,
        ...formData.getHeaders() // Explicitly set FormData headers
      },
      body: formData
    })
    
    const result = await response.json()
    
    console.log('📥 Response status:', response.status)
    console.log('📥 Response body:', result)
    
    if (response.ok && result.success) {
      console.log('✅ Post creation API test passed!')
    } else {
      console.log('❌ Post creation API test failed!')
      console.log('Error:', result.message)
    }
    
    // Clean up test image
    fs.unlinkSync(testImagePath)
    
  } catch (error) {
    console.error('❌ Error testing post creation API:', error)
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('⚠️  Fetch not available, installing node-fetch...')
  const { default: fetch } = await import('node-fetch')
  globalThis.fetch = fetch
}

testPostCreationAPI() 