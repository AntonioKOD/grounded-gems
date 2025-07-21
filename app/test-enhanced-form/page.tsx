"use client"

import { useState } from "react"
import EnhancedPostFormWrapper from "@/components/post/enhanced-post-form-wrapper"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, AlertCircle } from "lucide-react"

export default function TestEnhancedFormPage() {
  const [testResults, setTestResults] = useState<{
    formLoaded: boolean
    videoButtonClicked: boolean
    videoFileSelected: boolean
    formSubmitted: boolean
  }>({
    formLoaded: false,
    videoButtonClicked: false,
    videoFileSelected: false,
    formSubmitted: false
  })

  // Listen for console logs to track test progress
  useState(() => {
    const originalLog = console.log
    console.log = (...args) => {
      const message = args.join(' ')
      if (message.includes('📹 Video button clicked in enhanced form')) {
        setTestResults(prev => ({ ...prev, videoButtonClicked: true }))
      }
      if (message.includes('📹 Video input change event triggered')) {
        setTestResults(prev => ({ ...prev, videoFileSelected: true }))
      }
      if (message.includes('📝 Post created successfully')) {
        setTestResults(prev => ({ ...prev, formSubmitted: true }))
      }
      originalLog(...args)
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Enhanced Post Form Test</h1>
          <p className="text-gray-600 mb-4">
            This page tests the enhanced post form with video upload functionality.
          </p>
          
          {/* Test Status */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <h2 className="font-semibold mb-3">Test Status</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {testResults.formLoaded ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span>Form Loaded</span>
                </div>
                <div className="flex items-center gap-2">
                  {testResults.videoButtonClicked ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span>Video Button Clicked</span>
                </div>
                <div className="flex items-center gap-2">
                  {testResults.videoFileSelected ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span>Video File Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  {testResults.formSubmitted ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span>Form Submitted</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <h2 className="font-semibold mb-3">Test Instructions</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Open browser developer tools (F12)</li>
                <li>Go to the Console tab</li>
                <li>Follow the multi-step form below</li>
                <li>In Step 1, click "Choose Videos" button</li>
                <li>Select a video file</li>
                <li>Complete the form and submit</li>
                <li>Check console logs for debugging information</li>
                <li>Verify video appears in the feed after submission</li>
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Form */}
        <EnhancedPostFormWrapper 
          className="bg-white rounded-lg shadow-sm" 
          onSuccess={() => {
            console.log('📝 Test: Form submitted successfully')
            setTestResults(prev => ({ ...prev, formSubmitted: true }))
          }}
        />
      </div>
    </div>
  )
} 