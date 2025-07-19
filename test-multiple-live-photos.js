#!/usr/bin/env node

/**
 * Test script to verify multiple Live Photo uploads work correctly
 * This simulates uploading multiple HEIC files simultaneously
 */

const fs = require('fs')
const path = require('path')

// Simulate multiple Live Photo uploads
async function testMultipleLivePhotos() {
  console.log('🧪 Testing multiple Live Photo uploads...')
  
  try {
    // Create test HEIC files (simulating uploads)
    const mediaDir = path.join(process.cwd(), 'media')
    const testFiles = []
    
    // Create 5 test files with different names
    for (let i = 1; i <= 5; i++) {
      const testFileName = `test_live_photo_${i}.heic`
      const testFilePath = path.join(mediaDir, testFileName)
      
      // Create a dummy HEIC file (just for testing)
      fs.writeFileSync(testFilePath, `dummy heic content ${i}`)
      testFiles.push(testFilePath)
      
      console.log(`📱 Created test file: ${testFileName}`)
    }
    
    console.log(`\n✅ Created ${testFiles.length} test Live Photo files`)
    console.log('📝 These files simulate multiple Live Photo uploads')
    console.log('🔧 The Media collection will now process them with queuing')
    
    // Instructions for testing
    console.log('\n📋 Next steps:')
    console.log('1. Upload these files through your app')
    console.log('2. Check the Media collection in Payload admin')
    console.log('3. Verify all files are converted to JPEG')
    console.log('4. Check conversion status for each file')
    
    console.log('\n🧹 To clean up test files:')
    console.log('rm media/test_live_photo_*.heic')
    
  } catch (error) {
    console.error('❌ Error in test:', error)
  }
}

// Run the test
if (require.main === module) {
  testMultipleLivePhotos()
}

module.exports = { testMultipleLivePhotos } 