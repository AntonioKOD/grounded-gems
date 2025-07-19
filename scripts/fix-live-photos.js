#!/usr/bin/env node

/**
 * Quick script to fix failed Live Photo conversions in production
 * Run this script to convert any HEIC files that failed to convert during upload
 */

const fs = require('fs')
const path = require('path')

// Helper function to safely load Sharp
const loadSharp = async () => {
  try {
    const sharp = await import('sharp')
    return sharp.default
  } catch (error) {
    console.error('❌ Failed to load Sharp library:', error)
    return null
  }
}

// Helper function to convert HEIC to JPEG
const convertHeicToJpeg = async (filePath, outputPath) => {
  try {
    const sharp = await loadSharp()
    if (!sharp) {
      throw new Error('Sharp library not available')
    }

    if (!fs.existsSync(filePath)) {
      throw new Error('Original file not found')
    }

    await sharp(filePath)
      .jpeg({ quality: 90 })
      .toFile(outputPath)

    return true
  } catch (error) {
    console.error('❌ Error converting HEIC to JPEG:', error)
    return false
  }
}

// Main function to fix Live Photos
async function fixLivePhotos() {
  console.log('🚀 Starting Live Photo fix script...')
  
  try {
    // Check if we're in the right directory
    if (!fs.existsSync('media')) {
      console.error('❌ Media directory not found. Make sure you\'re in the project root.')
      process.exit(1)
    }

    // Find all HEIC files in the media directory
    const mediaDir = path.join(process.cwd(), 'media')
    const files = fs.readdirSync(mediaDir)
    const heicFiles = files.filter(file => 
      file.toLowerCase().endsWith('.heic') || file.toLowerCase().endsWith('.heif')
    )

    console.log(`📱 Found ${heicFiles.length} Live Photo files to process`)

    if (heicFiles.length === 0) {
      console.log('✅ No Live Photos found to convert')
      return
    }

    let successCount = 0
    let failCount = 0

    for (const filename of heicFiles) {
      try {
        console.log(`🔄 Converting: ${filename}`)
        
        const filePath = path.join(mediaDir, filename)
        const outputPath = filePath.replace(/\.(heic|heif)$/i, '.jpg')
        const newFilename = path.basename(outputPath)

        // Check if JPEG already exists
        if (fs.existsSync(outputPath)) {
          console.log(`⚠️ JPEG already exists for ${filename}, skipping`)
          continue
        }

        // Convert HEIC to JPEG
        const success = await convertHeicToJpeg(filePath, outputPath)

        if (success) {
          // Remove the original HEIC file
          fs.unlinkSync(filePath)
          console.log(`✅ Converted: ${filename} → ${newFilename}`)
          successCount++
        } else {
          console.log(`❌ Failed to convert: ${filename}`)
          failCount++
        }

      } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error.message)
        failCount++
      }
    }

    console.log('\n📊 Conversion Summary:')
    console.log(`✅ Successfully converted: ${successCount}`)
    console.log(`❌ Failed conversions: ${failCount}`)
    console.log(`📱 Total Live Photos processed: ${heicFiles.length}`)

    if (failCount > 0) {
      console.log('\n⚠️ Some conversions failed. You may need to:')
      console.log('1. Check if Sharp library is properly installed')
      console.log('2. Verify file permissions')
      console.log('3. Check available disk space')
      console.log('4. Use the API endpoint /api/media/convert-live-photos for manual conversion')
    }

  } catch (error) {
    console.error('❌ Error in Live Photo fix script:', error)
    process.exit(1)
  }
}

// Run the script if called directly
if (require.main === module) {
  fixLivePhotos().catch(console.error)
}

module.exports = { fixLivePhotos } 