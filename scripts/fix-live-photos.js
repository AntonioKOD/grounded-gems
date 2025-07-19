#!/usr/bin/env node

/**
 * Quick script to fix failed Live Photo conversions in production
 * Run this script to convert any HEIC files that failed to convert during upload
 * Now supports multiple Live Photos with proper queuing
 */

const fs = require('fs')
const path = require('path')

// Queue for batch conversions
const conversionQueue = []
let isProcessingQueue = false

// Process conversion queue sequentially
const processQueue = async () => {
  if (isProcessingQueue || conversionQueue.length === 0) return
  
  isProcessingQueue = true
  
  while (conversionQueue.length > 0) {
    const task = conversionQueue.shift()
    if (!task) continue
    
    try {
      const result = await convertHeicToJpeg(task.filePath, task.outputPath)
      task.resolve(result)
    } catch (error) {
      task.reject(error)
    }
    
    // Small delay between conversions to prevent system overload
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  isProcessingQueue = false
}

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

// Helper function to queue conversion
const queueConversion = async (filePath, outputPath) => {
  return new Promise((resolve, reject) => {
    conversionQueue.push({
      id: path.basename(filePath),
      filePath,
      outputPath,
      resolve,
      reject
    })
    
    processQueue()
  })
}

// Helper function to generate unique filename
const generateUniqueFilename = (originalPath, baseDir) => {
  const ext = path.extname(originalPath)
  const baseName = path.basename(originalPath, ext)
  let counter = 1
  let newPath = path.join(baseDir, `${baseName}${ext}`)
  
  while (fs.existsSync(newPath)) {
    newPath = path.join(baseDir, `${baseName}_${counter}${ext}`)
    counter++
  }
  
  return newPath
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

    // Process files sequentially to prevent conflicts
    for (const filename of heicFiles) {
      try {
        console.log(`🔄 Converting: ${filename}`)
        
        const filePath = path.join(mediaDir, filename)
        
        // Generate unique output path to prevent conflicts
        const baseName = path.basename(filename, path.extname(filename))
        const timestamp = Date.now()
        const uniqueOutputPath = path.join(mediaDir, `${baseName}_${timestamp}.jpg`)

        // Check if JPEG already exists
        if (fs.existsSync(uniqueOutputPath)) {
          console.log(`⚠️ JPEG already exists for ${filename}, skipping`)
          continue
        }

        // Queue the conversion
        const success = await queueConversion(filePath, uniqueOutputPath)

        if (success) {
          // Remove the original HEIC file
          fs.unlinkSync(filePath)
          console.log(`✅ Converted: ${filename} → ${path.basename(uniqueOutputPath)}`)
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