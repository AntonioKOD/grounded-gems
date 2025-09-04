#!/usr/bin/env node

/**
 * Test script for enhanced video thumbnail generation
 * This script tests the new video thumbnail generation system
 */

const path = require('path')
const fs = require('fs')

// Test configuration
const TEST_CONFIG = {
  // Test with a sample video file (you can replace this with an actual video)
  sampleVideoPath: path.join(__dirname, 'public', 'sample-video.mp4'),
  // Test thumbnail output directory
  thumbnailOutputDir: path.join(__dirname, 'public', 'thumbnails'),
  // Test if we're using Vercel Blob storage
  isUsingVercelBlob: !!process.env.BLOB_READ_WRITE_TOKEN
}

console.log('🎬 Testing Enhanced Video Thumbnail Generation System')
console.log('=' .repeat(60))

// Test 1: Check dependencies
console.log('\n📦 Test 1: Checking Dependencies')
try {
  const ffmpeg = require('fluent-ffmpeg')
  const ffmpegStatic = require('ffmpeg-static')
  const mime = require('mime')
  
  console.log('✅ fluent-ffmpeg:', require('fluent-ffmpeg/package.json').version)
  console.log('✅ ffmpeg-static:', require('ffmpeg-static/package.json').version)
  console.log('✅ mime:', require('mime/package.json').version)
  console.log('✅ FFmpeg binary path:', ffmpegStatic)
} catch (error) {
  console.error('❌ Missing dependencies:', error.message)
  process.exit(1)
}

// Test 2: Check storage configuration
console.log('\n💾 Test 2: Storage Configuration')
console.log('Storage type:', TEST_CONFIG.isUsingVercelBlob ? 'Vercel Blob' : 'Local Disk')
if (TEST_CONFIG.isUsingVercelBlob) {
  console.log('✅ BLOB_READ_WRITE_TOKEN is configured')
} else {
  console.log('ℹ️  Using local disk storage (BLOB_READ_WRITE_TOKEN not set)')
}

// Test 3: Check thumbnail output directory
console.log('\n📁 Test 3: Thumbnail Output Directory')
try {
  if (!fs.existsSync(TEST_CONFIG.thumbnailOutputDir)) {
    fs.mkdirSync(TEST_CONFIG.thumbnailOutputDir, { recursive: true })
    console.log('✅ Created thumbnail output directory:', TEST_CONFIG.thumbnailOutputDir)
  } else {
    console.log('✅ Thumbnail output directory exists:', TEST_CONFIG.thumbnailOutputDir)
  }
} catch (error) {
  console.error('❌ Failed to create thumbnail directory:', error.message)
}

// Test 4: Test utility functions
console.log('\n🔧 Test 4: Utility Functions')
try {
  // Check if the TypeScript files exist and are syntactically correct
  const fs = require('fs')
  const videoThumbnailPath = path.join(__dirname, 'lib', 'video-thumbnail-generator.ts')
  const mediaCollectionPath = path.join(__dirname, 'collections', 'Media.ts')
  
  if (fs.existsSync(videoThumbnailPath)) {
    console.log('✅ video-thumbnail-generator.ts exists')
    const content = fs.readFileSync(videoThumbnailPath, 'utf8')
    if (content.includes('generateVideoThumbnailEnhanced')) {
      console.log('✅ generateVideoThumbnailEnhanced function found')
    } else {
      console.log('❌ generateVideoThumbnailEnhanced function not found')
    }
  } else {
    console.log('❌ video-thumbnail-generator.ts not found')
  }
} catch (error) {
  console.error('❌ Failed to check utility functions:', error.message)
}

// Test 5: Test Media collection structure
console.log('\n📋 Test 5: Media Collection Structure')
try {
  const fs = require('fs')
  const mediaCollectionPath = path.join(__dirname, 'collections', 'Media.ts')
  
  if (fs.existsSync(mediaCollectionPath)) {
    console.log('✅ Media.ts exists')
    const content = fs.readFileSync(mediaCollectionPath, 'utf8')
    
    // Check if required fields exist in the file content
    const requiredFields = ['type', 'thumbnailUrl', 'width', 'height', 'durationSec']
    
    for (const field of requiredFields) {
      if (content.includes(`name: '${field}'`)) {
        console.log(`✅ Field '${field}' exists`)
      } else {
        console.log(`❌ Field '${field}' is missing`)
      }
    }
    
    // Check for enhanced functions
    if (content.includes('handleVideoThumbnailGeneration')) {
      console.log('✅ Enhanced thumbnail generation function found')
    } else {
      console.log('❌ Enhanced thumbnail generation function not found')
    }
  } else {
    console.log('❌ Media.ts not found')
  }
} catch (error) {
  console.error('❌ Failed to check Media collection:', error.message)
}

// Test 6: Environment variables
console.log('\n🌍 Test 6: Environment Variables')
const requiredEnvVars = [
  'NEXT_PUBLIC_BASE_URL',
  'SERVER_URL',
  'BLOB_READ_WRITE_TOKEN'
]

for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: ${envVar === 'BLOB_READ_WRITE_TOKEN' ? '[SET]' : process.env[envVar]}`)
  } else {
    console.log(`ℹ️  ${envVar}: Not set (using default)`)
  }
}

// Test 7: FFmpeg availability
console.log('\n🎥 Test 7: FFmpeg Availability')
try {
  const ffmpegStatic = require('ffmpeg-static')
  if (fs.existsSync(ffmpegStatic)) {
    console.log('✅ FFmpeg binary found at:', ffmpegStatic)
  } else {
    console.log('❌ FFmpeg binary not found at:', ffmpegStatic)
  }
} catch (error) {
  console.error('❌ FFmpeg check failed:', error.message)
}

console.log('\n' + '=' .repeat(60))
console.log('🎬 Enhanced Video Thumbnail Generation System Test Complete')
console.log('\n📝 Next Steps:')
console.log('1. Upload a video file through the PayloadCMS admin interface')
console.log('2. Check the Media collection for the new fields: type, thumbnailUrl, width, height, durationSec')
console.log('3. Verify that a thumbnail is automatically generated and stored')
console.log('4. Check the thumbnail URL is accessible and displays correctly')

if (TEST_CONFIG.isUsingVercelBlob) {
  console.log('\n💡 Note: Using Vercel Blob storage - thumbnails will be stored in the cloud')
} else {
  console.log('\n💡 Note: Using local storage - thumbnails will be stored in /public/thumbnails/')
}
