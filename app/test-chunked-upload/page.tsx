"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { uploadFileInChunks, shouldUseChunkedUpload, getOptimalChunkSize } from '@/lib/chunked-upload'

export default function TestChunkedUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<any>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setProgress(0)
      setResult(null)
      console.log(`Selected file: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`)
      
      const shouldChunk = shouldUseChunkedUpload(selectedFile)
      const chunkSize = getOptimalChunkSize(selectedFile.size)
      console.log(`Should use chunked upload: ${shouldChunk}`)
      console.log(`Optimal chunk size: ${(chunkSize / 1024 / 1024).toFixed(2)}MB`)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first')
      return
    }

    setIsUploading(true)
    setProgress(0)
    setResult(null)

    try {
      console.log(`Starting upload for: ${file.name}`)
      
      const uploadResult = await uploadFileInChunks(file, {
        onProgress: (progressValue) => {
          setProgress(progressValue)
          console.log(`Upload progress: ${progressValue.toFixed(1)}%`)
        },
        onChunkComplete: (chunkIndex, totalChunks) => {
          console.log(`Chunk ${chunkIndex}/${totalChunks} completed`)
        }
      })

      setResult(uploadResult)
      
      if (uploadResult.success) {
        console.log('Upload successful:', uploadResult)
        toast.success('File uploaded successfully!')
      } else {
        console.error('Upload failed:', uploadResult.message)
        toast.error(`Upload failed: ${uploadResult.message}`)
      }

    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Chunked Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="file">Select File</Label>
            <Input
              id="file"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="mt-2"
            />
            {file && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-600">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
                </p>
                <p className="text-sm text-gray-600">
                  Type: {file.type}
                </p>
                <p className="text-sm text-gray-600">
                  Should chunk: {shouldUseChunkedUpload(file) ? 'Yes' : 'No'}
                </p>
                <p className="text-sm text-gray-600">
                  Optimal chunk size: {(getOptimalChunkSize(file.size) / 1024 / 1024).toFixed(2)}MB
                </p>
              </div>
            )}
          </div>
          
          {isUploading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-600 text-center">
                {progress.toFixed(1)}% complete
              </p>
            </div>
          )}
          
          <Button 
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : 'Upload File'}
          </Button>
          
          {result && (
            <div className={`p-4 border rounded-lg ${
              result.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h4 className={`font-medium mb-2 ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                Upload Result:
              </h4>
              <pre className={`text-sm overflow-auto ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 