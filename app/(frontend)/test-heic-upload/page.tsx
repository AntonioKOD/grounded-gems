'use client'

// Force dynamic rendering to prevent SSR issues with HEIC conversion libraries
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HEICImageUpload } from '@/components/ui/heic-image-upload'
import { 
  Smartphone, 
  Upload, 
  CheckCircle, 
  Info, 
  ImageIcon,
  ArrowRight,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'

export default function HEICTestPage() {
  const [uploadResults, setUploadResults] = useState<any[]>([])

  const handleUploadComplete = (result: any) => {
    console.log('Upload completed:', result)
    setUploadResults(prev => [...prev, result])
    toast.success('HEIC file uploaded successfully!')
  }

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error)
    toast.error(`Upload failed: ${error}`)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-3">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">HEIC Photo Upload</h1>
        </div>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Now you can upload photos directly from your iPhone! Our app automatically converts HEIC files 
          to JPEG format for universal compatibility.
        </p>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 text-center">
            <div className="bg-blue-100 rounded-full p-2 w-fit mx-auto mb-3">
              <Smartphone className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-blue-900 mb-1">iPhone Ready</h3>
            <p className="text-sm text-blue-700">Upload HEIC photos directly from your iPhone</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 text-center">
            <div className="bg-green-100 rounded-full p-2 w-fit mx-auto mb-3">
              <Zap className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-green-900 mb-1">Auto Convert</h3>
            <p className="text-sm text-green-700">Automatically converts to JPEG format</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4 text-center">
            <div className="bg-purple-100 rounded-full p-2 w-fit mx-auto mb-3">
              <CheckCircle className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-purple-900 mb-1">Universal Support</h3>
            <p className="text-sm text-purple-700">Works on all devices and browsers</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <Tabs defaultValue="demo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="demo">Live Demo</TabsTrigger>
          <TabsTrigger value="how-it-works">How It Works</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Your HEIC Photos
              </CardTitle>
              <CardDescription>
                Try uploading a HEIC photo from your iPhone to see the conversion in action
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HEICImageUpload
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                maxSizeInMB={10}
                conversionOptions={{ quality: 0.9, format: 'JPEG' }}
                showPreview={true}
                autoUpload={false}
                className="border-dashed border-2 border-[#4ECDC4]/30"
              />
            </CardContent>
          </Card>

          {/* Alternative upload styles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Auto Upload</CardTitle>
                <CardDescription>Files upload automatically after processing</CardDescription>
              </CardHeader>
              <CardContent>
                <HEICImageUpload
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  autoUpload={true}
                  showPreview={false}
                  className="min-h-[100px]"
                >
                  <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-[#4ECDC4] transition-colors">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Click to upload (Auto)</p>
                    <Badge variant="outline" className="mt-2">HEIC Supported</Badge>
                  </div>
                </HEICImageUpload>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Multiple Files</CardTitle>
                <CardDescription>Upload multiple HEIC files at once</CardDescription>
              </CardHeader>
              <CardContent>
                <HEICImageUpload
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  multiple={true}
                  showPreview={true}
                  className="min-h-[100px]"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="how-it-works" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>How HEIC Conversion Works</CardTitle>
              <CardDescription>
                Understanding the process behind seamless HEIC photo uploads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full p-4 w-fit mx-auto mb-4">
                    <Smartphone className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">1. Upload HEIC</h3>
                  <p className="text-sm text-gray-600">
                    Select your HEIC photos from iPhone. We detect the format automatically.
                  </p>
                </div>

                <div className="text-center">
                  <div className="bg-green-100 rounded-full p-4 w-fit mx-auto mb-4">
                    <Zap className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">2. Auto Convert</h3>
                  <p className="text-sm text-gray-600">
                    Our system converts HEIC to JPEG in your browser using the heic2any library.
                  </p>
                </div>

                <div className="text-center">
                  <div className="bg-purple-100 rounded-full p-4 w-fit mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">3. Universal Access</h3>
                  <p className="text-sm text-gray-600">
                    The converted JPEG works perfectly on all devices and platforms.
                  </p>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Privacy First:</strong> All conversion happens in your browser. 
                  Your original HEIC files never leave your device until you choose to upload the converted version.
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold mb-3">Technical Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span><strong>Format Support:</strong> HEIC, HEIF → JPEG, PNG</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span><strong>Quality Control:</strong> Configurable compression (90% default)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span><strong>Size Optimization:</strong> Often reduces file size by 20-40%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span><strong>Browser Support:</strong> Works in all modern browsers</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Results</CardTitle>
              <CardDescription>
                View the results of your HEIC file uploads and conversions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploadResults.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 mb-4">No uploads yet</p>
                  <p className="text-sm text-gray-400">
                    Upload some HEIC files in the demo tab to see results here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {uploadResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Upload #{index + 1}</h4>
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          Success
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">File ID:</span>
                          <p className="font-mono text-xs">{result.doc?.id}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Type:</span>
                          <p>{result.doc?.mimeType}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Size:</span>
                          <p>{result.doc?.filesize ? (result.doc.filesize / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <p className="text-green-600">Uploaded</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-[#4ECDC4]/10 to-[#FF6B6B]/10 border-[#4ECDC4]/30">
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-bold mb-2">Ready to use HEIC uploads in your workflow?</h3>
          <p className="text-gray-600 mb-4">
            HEIC support is now available across all photo upload features in Sacavia
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild className="bg-[#4ECDC4] hover:bg-[#3DBDB5]">
              <a href="/add-location">
                <Upload className="h-4 w-4 mr-2" />
                Add Location with HEIC Photos
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/profile">
                <ArrowRight className="h-4 w-4 mr-2" />
                Update Profile Picture
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 