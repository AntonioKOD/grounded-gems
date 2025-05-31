"use client"

import { useState } from 'react'

export default function TestUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setError(null)
    }
  }

  const testDirectUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('alt', 'Test upload')

      console.log('🧪 Testing direct upload to /api/upload-media')
      const response = await fetch('/api/upload-media', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        console.log('✅ Direct upload successful:', data)
        setResult(data)
      } else {
        console.error('❌ Direct upload failed:', data)
        setError(data.error || 'Upload failed')
      }
    } catch (err) {
      console.error('❌ Direct upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const testPayloadDirect = async () => {
    if (!file) return

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('alt', 'Test upload via Payload')

      console.log('🧪 Testing direct upload to Payload /api/media')
      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok) {
        console.log('✅ Payload upload successful:', data)
        setResult(data)
      } else {
        console.error('❌ Payload upload failed:', data)
        setError(data.message || data.error || 'Upload failed')
      }
    } catch (err) {
      console.error('❌ Payload upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Upload Test Page</h1>
      
      <div className="space-y-6">
        {/* File Input */}
        <div>
          <label htmlFor="file" className="block text-sm font-medium mb-2">
            Select File to Test
          </label>
          <input
            type="file"
            id="file"
            onChange={handleFileChange}
            accept="image/*,video/*"
            className="border border-gray-300 rounded p-2 w-full"
          />
          {file && (
            <p className="text-sm text-gray-600 mt-2">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
            </p>
          )}
        </div>

        {/* Test Buttons */}
        <div className="flex gap-4">
          <button
            onClick={testDirectUpload}
            disabled={!file || uploading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {uploading ? 'Uploading...' : 'Test /api/upload-media'}
          </button>

          <button
            onClick={testPayloadDirect}
            disabled={!file || uploading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {uploading ? 'Uploading...' : 'Test /api/media (Payload)'}
          </button>
        </div>

        {/* Results */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <strong>Success!</strong>
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* Environment Info */}
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Environment Info:</h3>
          <ul className="text-sm space-y-1">
            <li><strong>API URL:</strong> {process.env.NEXT_PUBLIC_PAYLOAD_API_URL || 'Not set'}</li>
            <li><strong>Mode:</strong> {process.env.NODE_ENV}</li>
          </ul>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Select an image or video file</li>
            <li>Try both upload methods</li>
            <li>Check the browser console for detailed logs</li>
            <li>Check the server console for backend logs</li>
          </ol>
        </div>
      </div>
    </div>
  )
} 