"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Video, Upload, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function TestVideoUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log('🎬 Test: File selected:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        isVideo: file.type.startsWith('video/')
      })
      setSelectedFile(file)
      setError(null)
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('No file selected')
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadResult(null)

    try {
      console.log('🎬 Test: Starting upload...')
      
      const formData = new FormData()
      formData.append('content', 'Test video upload')
      formData.append('postType', 'general')
      formData.append('videos', selectedFile)

      console.log('🎬 Test: FormData created:', {
        content: 'Test video upload',
        postType: 'general',
        videoFile: selectedFile.name
      })

      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user-id', // This will fail auth, but we can see the request
        },
        body: formData,
      })

      console.log('🎬 Test: API response:', {
        status: response.status,
        statusText: response.statusText
      })

      const result = await response.json()
      console.log('🎬 Test: API result:', result)

      if (response.ok) {
        setUploadResult(result)
      } else {
        setError(`Upload failed: ${result.message || response.statusText}`)
      }
    } catch (err) {
      console.error('🎬 Test: Upload error:', err)
      setError(`Upload error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Upload Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              This page tests video upload functionality to identify any issues.
            </p>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Select Video File
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {selectedFile && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">Selected File:</p>
                <p className="text-sm text-gray-600">Name: {selectedFile.name}</p>
                <p className="text-sm text-gray-600">Type: {selectedFile.type}</p>
                <p className="text-sm text-gray-600">Size: {(selectedFile.size / 1024 / 1024).toFixed(2)}MB</p>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="w-full"
            >
              {isUploading ? 'Uploading...' : 'Test Upload'}
            </Button>
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {uploadResult && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                <p className="font-medium">Upload successful!</p>
                <pre className="text-xs mt-2 overflow-auto">
                  {JSON.stringify(uploadResult, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Debug Information:</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Check browser console for detailed logs</p>
              <p>• Video files should be MP4, WebM, OGG, MOV, or AVI</p>
              <p>• Maximum file size: 50MB</p>
              <p>• Authentication will fail (expected for test)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 