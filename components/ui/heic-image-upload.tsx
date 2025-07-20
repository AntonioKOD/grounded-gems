'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Upload, Camera, Loader2, CheckCircle, AlertCircle, X, ImageIcon, Info, Clock, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  processImageFile, 
  getSupportedImageTypes, 
  isValidImageFile, 
  isHEICFile,
  getFileTypeDescription,
  type ConversionOptions 
} from '@/lib/heic-converter'

interface HEICImageUploadProps {
  onFileSelected?: (file: File, conversionInfo?: any) => void
  onUploadComplete?: (result: any) => void
  onUploadError?: (error: string) => void
  maxSizeInMB?: number
  conversionOptions?: ConversionOptions
  accept?: string
  multiple?: boolean
  disabled?: boolean
  className?: string
  showPreview?: boolean
  uploadEndpoint?: string
  autoUpload?: boolean
  children?: React.ReactNode
  showDetailedLogs?: boolean // New prop for detailed logging
  showLivePhotoWarning?: boolean // New prop to control Live Photo warning display
}

interface UploadState {
  status: 'idle' | 'converting' | 'uploading' | 'success' | 'error'
  progress: number
  message: string
  conversionInfo?: any
}

interface LogEntry {
  id: string
  timestamp: Date
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  details?: string
}

export function HEICImageUpload({
  onFileSelected,
  onUploadComplete,
  onUploadError,
  maxSizeInMB = 10,
  conversionOptions = { quality: 0.9, format: 'JPEG' },
  accept,
  multiple = false,
  disabled = false,
  className = '',
  showPreview = true,
  uploadEndpoint = '/api/media',
  autoUpload = false,
  children,
  showDetailedLogs = true, // Default to showing detailed logs
  showLivePhotoWarning = true // Default to showing Live Photo warning
}: HEICImageUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: ''
  })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const acceptTypes = accept || getSupportedImageTypes()
  const maxSizeBytes = maxSizeInMB * 1024 * 1024

  // Helper function for direct file upload
  const uploadFileDirect = async (file: File, endpoint: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('alt', file.name || '')

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      const errorMsg = error.error || `Upload failed for ${file.name}`
      addLog('error', `Upload failed: ${errorMsg}`, `Response status: ${response.status}`)
      throw new Error(errorMsg)
    }

    return await response.json()
  }

  // Helper function for chunked file upload
  const uploadFileInChunks = async (file: File, endpoint: string) => {
    const chunkSize = 2 * 1024 * 1024 // 2MB chunks for better compatibility
    const totalChunks = Math.ceil(file.size / chunkSize)
    const uploadId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    
    addLog('info', `Starting chunked upload: ${totalChunks} chunks of ${(chunkSize / 1024 / 1024).toFixed(1)}MB each`)

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunk = file.slice(start, end)
      
      const progress = ((chunkIndex + 0.5) / totalChunks) * 100
      setUploadState(prev => ({ 
        ...prev, 
        progress, 
        message: `Uploading chunk ${chunkIndex + 1}/${totalChunks}...` 
      }))

      addLog('info', `Uploading chunk ${chunkIndex + 1}/${totalChunks}`)

      const formData = new FormData()
      formData.append('chunk', chunk)
      formData.append('uploadId', uploadId)
      formData.append('chunkIndex', chunkIndex.toString())
      formData.append('totalChunks', totalChunks.toString())
      formData.append('fileName', file.name)
      formData.append('fileType', file.type)

      const response = await fetch(`${endpoint}/chunked`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        const errorMsg = error.error || `Chunk upload failed`
        addLog('error', `Chunk upload failed: ${errorMsg}`, `Chunk ${chunkIndex + 1}/${totalChunks}`)
        throw new Error(errorMsg)
      }

      // Small delay between chunks to prevent overwhelming the server
      if (chunkIndex < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Finalize the upload
    addLog('info', 'Finalizing chunked upload...')
    const finalizeResponse = await fetch(`${endpoint}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadId,
        fileName: file.name,
        fileType: file.type,
      }),
    })

    if (!finalizeResponse.ok) {
      const error = await finalizeResponse.json()
      const errorMsg = error.error || `Failed to finalize upload`
      addLog('error', `Finalization failed: ${errorMsg}`)
      throw new Error(errorMsg)
    }

    return await finalizeResponse.json()
  }

  // Helper function to add log entries
  const addLog = useCallback((type: LogEntry['type'], message: string, details?: string) => {
    const logEntry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      message,
      details
    }
    setLogs(prev => [...prev, logEntry])
    
    // Keep only last 20 logs to prevent memory issues
    if (logs.length > 20) {
      setLogs(prev => prev.slice(-20))
    }
  }, [logs.length])

  const resetState = useCallback(() => {
    setUploadState({ status: 'idle', progress: 0, message: '' })
    setSelectedFiles([])
    setPreviewUrls(prev => {
      prev.forEach(url => URL.revokeObjectURL(url))
      return []
    })
    setLogs([])
  }, [])

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (disabled) return

    const fileArray = Array.from(files)
    
    // Clear previous logs
    setLogs([])
    addLog('info', `Starting to process ${fileArray.length} file(s)`)
    
    // Validate each file
    for (const file of fileArray) {
      addLog('info', `Validating file: ${file.name}`)
      
      if (!isValidImageFile(file)) {
        const errorMsg = `${file.name} is not a valid image file`
        addLog('error', errorMsg)
        toast.error(errorMsg)
        return
      }

      if (file.size > maxSizeBytes) {
        const errorMsg = `${file.name} is too large. Maximum size is ${maxSizeInMB}MB`
        addLog('error', errorMsg)
        toast.error(errorMsg)
        return
      }

      // Check if it's a HEIC file
      if (isHEICFile(file)) {
        addLog('info', `HEIC file detected: ${file.name}`, `Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      } else {
        addLog('info', `Standard image file: ${file.name}`, `Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      }
    }

    // Check for Live Photo limitations
    const livePhotos = fileArray.filter(file => 
      file.type === 'image/heic' || file.type === 'image/heif'
    )
    const existingLivePhotos = selectedFiles.filter(file => 
      file.type === 'image/heic' || file.type === 'image/heif'
    )
    
    if (livePhotos.length > 0 && existingLivePhotos.length >= 1) {
      const warningMsg = `Live Photo Limit: You can only upload 1 Live Photo per post. ${livePhotos.length} additional Live Photo(s) will be converted to regular photos.`
      addLog('warning', 'Live Photo Limit', warningMsg)
      toast.warning(warningMsg, { duration: 5000 })
      
      // Show a more prominent warning in the upload area
      setUploadState(prev => ({
        ...prev,
        message: `⚠️ Live Photo Limit: Only 1 Live Photo supported. ${livePhotos.length} additional Live Photo(s) will be converted.`
      }))
      
      // Clear the warning after 5 seconds
      setTimeout(() => {
        setUploadState(prev => ({
          ...prev,
          message: 'Upload Images'
        }))
      }, 5000)
    }

    // Process files (convert HEIC if needed)
    setUploadState({ status: 'converting', progress: 0, message: 'Processing images...' })
    addLog('info', 'Starting file processing and conversion')
    
    try {
      const processedFiles: File[] = []
      const newPreviewUrls: string[] = []
      let totalConversionInfo: any = null

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        const progress = ((i + 0.5) / fileArray.length) * 100

        setUploadState(prev => ({ 
          ...prev, 
          progress, 
          message: `Processing ${file?.name}${isHEICFile(file || new File([], '')) ? ' (converting HEIC)' : ''}...` 
        }))

        addLog('info', `Processing file ${i + 1}/${fileArray.length}: ${file?.name || 'Unknown file'}`)

        const startTime = Date.now()
        const result = await processImageFile(file || new File([], ''), conversionOptions)
        const processingTime = Date.now() - startTime

        if (result.wasConverted) {
          addLog('success', `HEIC conversion successful: ${file?.name || 'Unknown file'}`, 
            `Original: ${(file?.size || 0 / 1024 / 1024).toFixed(2)}MB → Converted: ${(result.file.size / 1024 / 1024).toFixed(2)}MB (${processingTime}ms)`)
          
          if (result.conversionInfo) {
            addLog('info', `Conversion details: Quality ${((result.conversionInfo as any).quality * 100).toFixed(0)}%, Format: ${(result.conversionInfo as any).format}`)
          }
          
          totalConversionInfo = result.conversionInfo
          toast.success(
            `HEIC file converted successfully! Reduced size by ${result.conversionInfo?.compressionRatio.toFixed(1)}%`
          )
        } else {
          addLog('info', `No conversion needed: ${file?.name || 'Unknown file'}`, `Processing time: ${processingTime}ms`)
        }

        processedFiles.push(result.file)
        
        // Create preview URL
        const previewUrl = URL.createObjectURL(result.file)
        newPreviewUrls.push(previewUrl)
        addLog('info', `Preview created for: ${file?.name || 'Unknown file'}`)

        // Notify parent component
        if (onFileSelected) {
          onFileSelected(result.file, result.conversionInfo)
        }
      }

      setSelectedFiles(processedFiles)
      setPreviewUrls(newPreviewUrls)
      setUploadState({ 
        status: 'success', 
        progress: 100, 
        message: 'Files processed successfully!',
        conversionInfo: totalConversionInfo
      })

      addLog('success', `All files processed successfully!`, `Total files: ${processedFiles.length}`)

      // Auto upload if enabled
      if (autoUpload && processedFiles.length > 0) {
        addLog('info', 'Starting automatic upload...')
        await uploadFiles(processedFiles)
      }

    } catch (error) {
      console.error('Error processing files:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to process files'
      addLog('error', `Processing failed: ${errorMessage}`)
      setUploadState({ status: 'error', progress: 0, message: errorMessage })
      toast.error(errorMessage)
      if (onUploadError) {
        onUploadError(errorMessage)
      }
    }
  }, [disabled, maxSizeBytes, maxSizeInMB, conversionOptions, onFileSelected, autoUpload, addLog])

  const uploadFiles = useCallback(async (files: File[]) => {
    setUploadState({ status: 'uploading', progress: 0, message: 'Uploading...' })
    addLog('info', `Starting upload of ${files.length} file(s) to server`)

    try {
      const uploadResults = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const progress = ((i + 0.5) / files.length) * 100

        setUploadState(prev => ({ 
          ...prev, 
          progress, 
          message: `Uploading ${file?.name}...` 
        }))

        addLog('info', `Uploading file ${i + 1}/${files.length}: ${file?.name || 'Unknown file'}`)

        // Check file size and use chunked upload for large files
        const fileSizeMB = (file?.size || 0) / 1024 / 1024
        let result

        if (fileSizeMB > 5) { // Reduced threshold to 5MB for more aggressive chunking
          addLog('info', `Large file detected (${fileSizeMB.toFixed(2)}MB), using chunked upload`)
          result = await uploadFileInChunks(file || new File([], ''), uploadEndpoint)
        } else {
          result = await uploadFileDirect(file || new File([], ''), uploadEndpoint)
        }

        uploadResults.push(result)
        
        addLog('success', `Upload successful: ${file?.name || 'Unknown file'}`, `Server ID: ${result.id}`)
      }

      setUploadState({ 
        status: 'success', 
        progress: 100, 
        message: `Successfully uploaded ${files.length} file(s)!` 
      })

      addLog('success', `All uploads completed successfully!`, `Total uploaded: ${files.length} files`)

      toast.success(`Successfully uploaded ${files.length} file(s)!`)

      if (onUploadComplete) {
        onUploadComplete(multiple ? uploadResults : uploadResults[0])
      }

    } catch (error) {
      console.error('Error uploading files:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      addLog('error', `Upload process failed: ${errorMessage}`)
      setUploadState({ status: 'error', progress: 0, message: errorMessage })
      toast.error(errorMessage)
      if (onUploadError) {
        onUploadError(errorMessage)
      }
    }
  }, [uploadEndpoint, multiple, onUploadComplete, onUploadError, addLog])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => {
      const newUrls = prev.filter((_, i) => i !== index)
      // Revoke the removed URL
      if (prev[index]) {
        URL.revokeObjectURL(prev[index])
      }
      return newUrls
    })
    addLog('info', `Removed file at index ${index}`)
  }

  const getStatusIcon = () => {
    switch (uploadState.status) {
      case 'converting':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'uploading':
        return <Upload className="h-4 w-4" />
      case 'success':
        return <CheckCircle className="h-4 w-4" />
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <ImageIcon className="h-4 w-4" />
    }
  }

  const getStatusColor = () => {
    switch (uploadState.status) {
      case 'converting':
        return 'text-blue-600'
      case 'uploading':
        return 'text-purple-600'
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const renderContent = () => {
    if (children) {
      return children
    }

    return (
      <div className="space-y-4">
        {/* Live Photo Support Warning - Only show if enabled */}
        {showLivePhotoWarning && (
          <Alert className="bg-amber-50 border-amber-200 text-amber-800">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Live Photo Support:</strong> We currently support 1 Live Photo per post. 
              Additional Live Photos will be automatically converted to regular photos for better compatibility.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
            uploadState.status === 'idle' 
              ? 'border-gray-300 hover:border-gray-400 bg-gray-50' 
              : 'border-blue-500 bg-blue-50'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              {getStatusIcon()}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {uploadState.status === 'idle' ? 'Upload Images' : uploadState.message}
              </h3>
              <p className="text-sm text-gray-600">
                {uploadState.status === 'idle' 
                  ? 'Drag & drop images here or click to browse' 
                  : 'Processing your files...'
                }
              </p>
            </div>

            {uploadState.status !== 'idle' && (
              <div className="space-y-2">
                <Progress value={uploadState.progress} className="w-full" />
                <p className="text-xs text-gray-500">
                  {uploadState.progress.toFixed(0)}% complete
                </p>
              </div>
            )}

            <Button
              type="button"
              onClick={triggerFileInput}
              disabled={disabled || uploadState.status === 'converting' || uploadState.status === 'uploading'}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
          </div>
        </div>

        {/* File Previews */}
        {showPreview && selectedFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Selected Files:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={previewUrls[index]}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
                  {(file.type === 'image/heic' || file.type === 'image/heif') && (
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-amber-700 font-medium">Live Photo</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Logs */}
        {showDetailedLogs && logs.length > 0 && (
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-blue-600" />
                <h4 className="font-medium text-gray-900">Processing Log</h4>
                <Badge variant="secondary" className="ml-auto">
                  {logs.length} entries
                </Badge>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 p-2 rounded text-sm ${
                      log.type === 'error' ? 'bg-red-50 border border-red-200' :
                      log.type === 'success' ? 'bg-green-50 border border-green-200' :
                      log.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className={`mt-0.5 ${
                      log.type === 'error' ? 'text-red-600' :
                      log.type === 'success' ? 'text-green-600' :
                      log.type === 'warning' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      {log.type === 'error' ? <AlertCircle className="h-3 w-3" /> :
                       log.type === 'success' ? <CheckCircle className="h-3 w-3" /> :
                       log.type === 'warning' ? <AlertCircle className="h-3 w-3" /> :
                       <Info className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{log.message}</p>
                      {log.details && (
                        <p className="text-xs text-gray-600 mt-1">{log.details}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {log.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Alert */}
        {uploadState.status === 'error' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {uploadState.message}
            </AlertDescription>
          </Alert>
        )}

        {uploadState.status === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {uploadState.message}
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      {renderContent()}
      
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes}
        multiple={multiple}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  )
} 