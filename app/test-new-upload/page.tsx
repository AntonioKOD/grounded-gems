"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export default function TestNewUpload() {
  const [files, setFiles] = useState<File[]>([])
  const [content, setContent] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles(selectedFiles)
    
    addLog(`Selected ${selectedFiles.length} files`)
    selectedFiles.forEach(file => {
      addLog(`- ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || files.length === 0) {
      toast.error('Please add content and select files')
      return
    }

    setIsUploading(true)
    addLog('🚀 Starting upload process...')

    try {
      // Step 1: Upload files first
      const mediaIds: string[] = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileSizeMB = file.size / 1024 / 1024
        
        addLog(`📤 Uploading file ${i + 1}/${files.length}: ${file.name} (${fileSizeMB.toFixed(2)}MB)`)
        
        // Use chunked upload for files >2MB
        let uploadEndpoint = '/api/media'
        if (fileSizeMB > 2) {
          uploadEndpoint = '/api/media/chunked'
          addLog(`📦 Using chunked upload for large file: ${file.name}`)
        }
        
        const formData = new FormData()
        formData.append('file', file)
        formData.append('alt', file.name)
        
        const uploadResponse = await fetch(uploadEndpoint, {
          method: 'POST',
          body: formData,
        })
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          addLog(`❌ Upload failed for ${file.name}: ${uploadResponse.status}`)
          addLog(`❌ Error: ${errorText}`)
          throw new Error(`Failed to upload ${file.name}: ${uploadResponse.status}`)
        }
        
        const uploadResult = await uploadResponse.json()
        if (uploadResult.id) {
          mediaIds.push(uploadResult.id)
          addLog(`✅ Uploaded ${file.name}: ${uploadResult.id}`)
        } else {
          throw new Error(`No media ID returned for ${file.name}`)
        }
        
        // Small delay between uploads
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      addLog(`✅ All files uploaded successfully: ${mediaIds.length} media IDs`)
      
      // Step 2: Create post with media IDs
      const postData = {
        content: content.trim(),
        type: 'post',
        photos: mediaIds
      }
      
      const payloadSize = JSON.stringify(postData).length
      const payloadSizeMB = payloadSize / 1024 / 1024
      
      addLog(`📊 Post payload size: ${payloadSizeMB.toFixed(2)}MB`)
      
      if (payloadSizeMB > 4.5) {
        addLog(`❌ Post payload too large: ${payloadSizeMB.toFixed(2)}MB`)
        toast.error(`Post data too large (${payloadSizeMB.toFixed(2)}MB)`)
        return
      }

      addLog('📝 Creating post with media IDs...')

      const response = await fetch("/api/posts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(postData),
      })

      if (!response.ok) {
        let errorMessage = "Failed to create post"
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (parseError) {
          const errorText = await response.text()
          addLog(`❌ Response parsing failed: ${errorText.substring(0, 100)}`)
          errorMessage = `Server error: ${response.status} - ${errorText.substring(0, 100)}`
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      if (result.success) {
        addLog(`✅ Post created successfully: ${result.post.id}`)
        toast.success("Post created successfully!")
        
        // Reset form
        setContent('')
        setFiles([])
        if (document.getElementById('file-input')) {
          (document.getElementById('file-input') as HTMLInputElement).value = ''
        }
      } else {
        throw new Error(result.message || "Failed to create post")
      }

    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      toast.error(error instanceof Error ? error.message : "Failed to create post")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Test New Upload Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="content">Post Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your post content..."
                className="mt-2"
                rows={4}
              />
            </div>
            
            <div>
              <Label htmlFor="file-input">Select Files</Label>
              <Input
                id="file-input"
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="mt-2"
              />
              {files.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  Selected {files.length} files:
                  <ul className="mt-1 space-y-1">
                    {files.map((file, index) => (
                      <li key={index}>
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <Button 
              type="submit" 
              disabled={isUploading || !content.trim() || files.length === 0}
              className="w-full"
            >
              {isUploading ? 'Uploading...' : 'Create Post'}
            </Button>
          </form>
          
          {logs.length > 0 && (
            <div className="mt-6">
              <Label>Upload Logs</Label>
              <div className="mt-2 p-4 bg-gray-100 rounded-lg max-h-96 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 