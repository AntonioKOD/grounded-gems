'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Upload, Camera, Loader2, CheckCircle, AlertCircle, X, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
}

interface UploadState {
  status: 'idle' | 'converting' | 'uploading' | 'success' | 'error'
  progress: number
  message: string
  conversionInfo?: any
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
  children
}: HEICImageUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: ''
  })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const acceptTypes = accept || getSupportedImageTypes()
  const maxSizeBytes = maxSizeInMB * 1024 * 1024

  const resetState = useCallback(() => {
    setUploadState({ status: 'idle', progress: 0, message: '' })
    setSelectedFiles([])
    setPreviewUrls(prev => {
      prev.forEach(url => URL.revokeObjectURL(url))
      return []
    })
  }, [])

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (disabled) return

    const fileArray = Array.from(files)
    
    // Validate each file
    for (const file of fileArray) {
      if (!isValidImageFile(file)) {
        toast.error(`${file.name} is not a valid image file`)
        return
      }

      if (file.size > maxSizeBytes) {
        toast.error(`${file.name} is too large. Maximum size is ${maxSizeInMB}MB`)
        return
      }
    }

    // Process files (convert HEIC if needed)
    setUploadState({ status: 'converting', progress: 0, message: 'Processing images...' })
    
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
          message: `Processing ${file.name}${isHEICFile(file) ? ' (converting HEIC)' : ''}...` 
        }))

        const result = await processImageFile(file, conversionOptions)
        processedFiles.push(result.file)
        
        // Create preview URL
        const previewUrl = URL.createObjectURL(result.file)
        newPreviewUrls.push(previewUrl)

        if (result.wasConverted) {
          totalConversionInfo = result.conversionInfo
          toast.success(
            `HEIC file converted successfully! Reduced size by ${result.conversionInfo?.compressionRatio.toFixed(1)}%`
          )
        }

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

      // Auto upload if enabled
      if (autoUpload && processedFiles.length > 0) {
        await uploadFiles(processedFiles)
      }

    } catch (error) {
      console.error('Error processing files:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to process files'
      setUploadState({ status: 'error', progress: 0, message: errorMessage })
      toast.error(errorMessage)
      if (onUploadError) {
        onUploadError(errorMessage)
      }
    }
  }, [disabled, maxSizeBytes, maxSizeInMB, conversionOptions, onFileSelected, autoUpload])

  const uploadFiles = useCallback(async (files: File[]) => {
    setUploadState({ status: 'uploading', progress: 0, message: 'Uploading...' })

    try {
      const uploadResults = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const progress = ((i + 0.5) / files.length) * 100

        setUploadState(prev => ({ 
          ...prev, 
          progress, 
          message: `Uploading ${file.name}...` 
        }))

        const formData = new FormData()
        formData.append('file', file)
        formData.append('alt', file.name)

        const response = await fetch(uploadEndpoint, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || `Upload failed for ${file.name}`)
        }

        const result = await response.json()
        uploadResults.push(result)
      }

      setUploadState({ 
        status: 'success', 
        progress: 100, 
        message: `Successfully uploaded ${files.length} file(s)!` 
      })

      toast.success(`Successfully uploaded ${files.length} file(s)!`)

      if (onUploadComplete) {
        onUploadComplete(multiple ? uploadResults : uploadResults[0])
      }

    } catch (error) {
      console.error('Error uploading files:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadState({ status: 'error', progress: 0, message: errorMessage })
      toast.error(errorMessage)
      if (onUploadError) {
        onUploadError(errorMessage)
      }
    }
  }, [uploadEndpoint, multiple, onUploadComplete, onUploadError])

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
  }

  const renderContent = () => {
    if (children) {
      return (
        <div onClick={triggerFileInput} className="cursor-pointer">
          {children}
        </div>
      )
    }

    return (
      <div
        onClick={triggerFileInput}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`
          border-2 border-dashed border-gray-300 rounded-lg p-6 text-center 
          cursor-pointer hover:border-[#4ECDC4] hover:bg-[#4ECDC4]/5 
          transition-all duration-200 min-h-[120px] flex flex-col items-center justify-center
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        <div className="bg-[#4ECDC4]/10 rounded-full p-3 mb-3">
          {uploadState.status === 'converting' || uploadState.status === 'uploading' ? (
            <Loader2 className="h-6 w-6 text-[#4ECDC4] animate-spin" />
          ) : uploadState.status === 'success' ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : uploadState.status === 'error' ? (
            <AlertCircle className="h-6 w-6 text-red-600" />
          ) : (
            <Upload className="h-6 w-6 text-[#4ECDC4]" />
          )}
        </div>
        
        <p className="text-base font-medium text-gray-700 mb-1">
          {uploadState.status === 'converting' && 'Converting HEIC files...'}
          {uploadState.status === 'uploading' && 'Uploading...'}
          {uploadState.status === 'success' && 'Upload complete!'}
          {uploadState.status === 'error' && 'Upload failed'}
          {uploadState.status === 'idle' && 'Choose images or drag & drop'}
        </p>
        
        <p className="text-sm text-gray-500 mb-2">
          {uploadState.message || `Supports all image formats including HEIC • Max ${maxSizeInMB}MB each`}
        </p>

        {(uploadState.status === 'converting' || uploadState.status === 'uploading') && (
          <Progress value={uploadState.progress} className="w-full max-w-xs mb-2" />
        )}

        <div className="flex flex-wrap gap-1 justify-center">
          <Badge variant="outline" className="text-xs">HEIC/HEIF</Badge>
          <Badge variant="outline" className="text-xs">JPG/JPEG</Badge>
          <Badge variant="outline" className="text-xs">PNG</Badge>
          <Badge variant="outline" className="text-xs">WebP</Badge>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
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

      {uploadState.status === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {uploadState.message}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetState}
              className="ml-2"
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {uploadState.conversionInfo && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            HEIC conversion successful! Original: {(uploadState.conversionInfo.originalSize / 1024 / 1024).toFixed(2)}MB → 
            Converted: {(uploadState.conversionInfo.convertedSize / 1024 / 1024).toFixed(2)}MB 
            ({uploadState.conversionInfo.compressionRatio.toFixed(1)}% reduction)
          </AlertDescription>
        </Alert>
      )}

      {showPreview && selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Selected Files</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                  {previewUrls[index] && (
                    <img
                      src={previewUrls[index]}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  <p className="text-xs font-medium text-gray-600 truncate">{file.name}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {getFileTypeDescription(file)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0 hover:bg-red-100"
                    >
                      <X className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {!autoUpload && selectedFiles.length > 0 && uploadState.status === 'success' && (
            <Button 
              onClick={() => uploadFiles(selectedFiles)} 
              disabled={uploadState.status === 'uploading'}
              className="w-full"
            >
              {uploadState.status === 'uploading' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {selectedFiles.length} File(s)
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
} 