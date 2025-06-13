'use client'

// Dynamic import to prevent SSR issues
const loadHeic2any = async () => {
  if (typeof window === 'undefined') {
    throw new Error('HEIC conversion is only available in the browser')
  }
  const heic2any = await import('heic2any')
  return heic2any.default
}

export interface ConversionOptions {
  quality?: number
  format?: 'JPEG' | 'PNG'
  maxWidth?: number
  maxHeight?: number
}

export interface ConversionResult {
  convertedFile: File
  originalSize: number
  convertedSize: number
  compressionRatio: number
}

/**
 * Check if a file is a HEIC format
 */
export function isHEICFile(file: File): boolean {
  // Check by MIME type
  if (file.type === 'image/heic' || file.type === 'image/heif') {
    return true
  }
  
  // Check by file extension as fallback (since some browsers don't set MIME type correctly)
  const filename = file.name.toLowerCase()
  return filename.endsWith('.heic') || filename.endsWith('.heif')
}

/**
 * Convert HEIC file to JPEG or PNG
 */
export async function convertHEICFile(
  file: File, 
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const {
    quality = 0.9,
    format = 'JPEG',
    maxWidth,
    maxHeight
  } = options

  if (!isHEICFile(file)) {
    throw new Error('File is not a HEIC format')
  }

  try {
    console.log(`🔄 Converting HEIC file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
    
    // Dynamically load heic2any to prevent SSR issues
    const heic2any = await loadHeic2any()
    
    // Convert HEIC to target format
    const convertedBlob = await heic2any({
      blob: file,
      toType: `image/${format.toLowerCase()}`,
      quality: quality,
    }) as Blob

    // If we have size constraints, we'll need to resize
    let finalBlob = convertedBlob
    
    if (maxWidth || maxHeight) {
      finalBlob = await resizeImage(convertedBlob, maxWidth, maxHeight, quality)
    }

    // Create new File object with converted data
    const originalExtension = file.name.split('.').pop() || 'heic'
    const nameWithoutExtension = file.name.replace(new RegExp(`\\.${originalExtension}$`, 'i'), '')
    const newExtension = format.toLowerCase() === 'jpeg' ? 'jpg' : format.toLowerCase()
    const convertedFileName = `${nameWithoutExtension}.${newExtension}`

    const convertedFile = new File([finalBlob], convertedFileName, {
      type: `image/${format.toLowerCase() === 'jpeg' ? 'jpeg' : format.toLowerCase()}`,
      lastModified: Date.now(),
    })

    const compressionRatio = ((file.size - convertedFile.size) / file.size * 100)

    console.log(`✅ HEIC conversion successful:`)
    console.log(`   Original: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
    console.log(`   Converted: ${(convertedFile.size / 1024 / 1024).toFixed(2)}MB`)
    console.log(`   Compression: ${compressionRatio.toFixed(1)}%`)

    return {
      convertedFile,
      originalSize: file.size,
      convertedSize: convertedFile.size,
      compressionRatio
    }

  } catch (error) {
    console.error('❌ HEIC conversion failed:', error)
    throw new Error(`Failed to convert HEIC file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Resize image blob to fit within max dimensions
 */
async function resizeImage(
  blob: Blob, 
  maxWidth?: number, 
  maxHeight?: number, 
  quality: number = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    img.onload = () => {
      let { width, height } = img

      // Calculate new dimensions
      if (maxWidth && width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      if (maxHeight && height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }

      // Set canvas size
      canvas.width = width
      canvas.height = height

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to blob
      canvas.toBlob(
        (resizedBlob) => {
          if (resizedBlob) {
            resolve(resizedBlob)
          } else {
            reject(new Error('Failed to resize image'))
          }
        },
        blob.type,
        quality
      )
    }

    img.onerror = () => {
      reject(new Error('Failed to load image for resizing'))
    }

    img.src = URL.createObjectURL(blob)
  })
}

/**
 * Process any image file - converts HEIC if needed, otherwise returns original
 */
export async function processImageFile(
  file: File,
  options: ConversionOptions = {}
): Promise<{ file: File; wasConverted: boolean; conversionInfo?: ConversionResult }> {
  if (isHEICFile(file)) {
    const conversionResult = await convertHEICFile(file, options)
    return {
      file: conversionResult.convertedFile,
      wasConverted: true,
      conversionInfo: conversionResult
    }
  }

  return {
    file,
    wasConverted: false
  }
}

/**
 * Get supported file types string for input accept attribute
 */
export function getSupportedImageTypes(): string {
  return 'image/*,.heic,.heif'
}

/**
 * Validate image file type including HEIC
 */
export function isValidImageFile(file: File): boolean {
  // Standard image types
  if (file.type.startsWith('image/')) {
    return true
  }
  
  // HEIC files (some browsers don't set MIME type correctly)
  return isHEICFile(file)
}

/**
 * Get human-readable file type description
 */
export function getFileTypeDescription(file: File): string {
  if (isHEICFile(file)) {
    return 'HEIC Image'
  }
  
  const mimeTypeParts = file.type.split('/')
  if (mimeTypeParts[0] === 'image') {
    return `${mimeTypeParts[1].toUpperCase()} Image`
  }
  
  return 'Unknown'
} 