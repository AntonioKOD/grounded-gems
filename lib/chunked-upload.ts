// Chunked upload utility for large files
export interface ChunkedUploadOptions {
  chunkSize?: number // Size of each chunk in bytes (default: 2MB)
  endpoint?: string // Upload endpoint
  onProgress?: (progress: number) => void // Progress callback
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void // Chunk completion callback
}

export interface ChunkedUploadResult {
  success: boolean
  id?: string
  filename?: string
  url?: string
  mimeType?: string
  filesize?: number
  message?: string
}

export async function uploadFileInChunks(
  file: File,
  options: ChunkedUploadOptions = {}
): Promise<ChunkedUploadResult> {
  const {
    chunkSize = 2 * 1024 * 1024, // 2MB default
    endpoint = '/api/media/chunked-upload',
    onProgress,
    onChunkComplete
  } = options

  try {
    console.log(`📦 Starting chunked upload for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
    
    // Generate unique upload ID
    const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Calculate number of chunks
    const totalChunks = Math.ceil(file.size / chunkSize)
    
    console.log(`📦 File will be split into ${totalChunks} chunks of ${(chunkSize / 1024 / 1024).toFixed(2)}MB each`)
    
    // Upload chunks sequentially
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunk = file.slice(start, end)
      
      console.log(`📦 Uploading chunk ${chunkIndex + 1}/${totalChunks} (${(chunk.size / 1024 / 1024).toFixed(2)}MB)`)
      
      const formData = new FormData()
      formData.append('chunk', chunk)
      formData.append('uploadId', uploadId)
      formData.append('chunkIndex', chunkIndex.toString())
      formData.append('totalChunks', totalChunks.toString())
      formData.append('fileName', file.name)
      formData.append('fileType', file.type)
      formData.append('alt', file.name)
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Chunk ${chunkIndex + 1} upload failed:`, errorText)
        throw new Error(`Chunk upload failed: ${response.status} - ${errorText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Chunk upload failed')
      }
      
      // Update progress
      const progress = ((chunkIndex + 1) / totalChunks) * 100
      onProgress?.(progress)
      onChunkComplete?.(chunkIndex + 1, totalChunks)
      
      console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`)
      
      // If this was the last chunk, return the final result
      if (chunkIndex === totalChunks - 1 && result.id) {
        console.log(`🎉 Chunked upload completed successfully: ${result.id}`)
        return {
          success: true,
          id: result.id,
          filename: result.filename,
          url: result.url,
          mimeType: result.mimeType,
          filesize: result.filesize,
          message: 'File uploaded successfully'
        }
      }
      
      // Small delay between chunks to prevent overwhelming the server
      if (chunkIndex < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    throw new Error('Upload completed but no file ID returned')
    
  } catch (error) {
    console.error('❌ Chunked upload failed:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

// Helper function to determine if chunked upload is needed
export function shouldUseChunkedUpload(file: File, threshold: number = 10 * 1024 * 1024): boolean {
  return file.size > threshold // Use chunked upload for files > 10MB
}

// Helper function to get optimal chunk size based on file size
export function getOptimalChunkSize(fileSize: number): number {
  if (fileSize <= 10 * 1024 * 1024) return 1 * 1024 * 1024 // 1MB for small files
  if (fileSize <= 50 * 1024 * 1024) return 2 * 1024 * 1024 // 2MB for medium files
  if (fileSize <= 100 * 1024 * 1024) return 5 * 1024 * 1024 // 5MB for large files
  return 10 * 1024 * 1024 // 10MB for very large files
} 