'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PhotoSubmissionModal } from '@/components/location/photo-submission-modal'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestPhotoModalPage() {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const testLocation = {
    id: 'test-location-123',
    name: 'Test Location'
  }

  const testUser = user ? {
    id: user.id,
    name: user.name || user.email || 'Test User',
    avatar: typeof user.profileImage === 'object' ? user.profileImage?.url : user.profileImage
  } : null

  console.log('🧪 Test page render:', {
    user: testUser,
    location: testLocation,
    isModalOpen
  })

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Photo Submission Modal Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current State:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>User:</strong> {testUser ? '✅ Logged in' : '❌ Not logged in'}
                {testUser && (
                  <div className="ml-4 text-gray-600">
                    ID: {testUser.id}<br/>
                    Name: {testUser.name}<br/>
                    Avatar: {testUser.avatar ? '✅' : '❌'}
                  </div>
                )}
              </div>
              <div>
                <strong>Location:</strong> ✅ Available<br/>
                <div className="ml-4 text-gray-600">
                  ID: {testLocation.id}<br/>
                  Name: {testLocation.name}
                </div>
              </div>
              <div>
                <strong>Modal State:</strong> {isModalOpen ? '🟢 Open' : '🔴 Closed'}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Actions:</h3>
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={() => setIsModalOpen(true)}
                disabled={!testUser}
                className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
              >
                Open Photo Modal
              </Button>
              
              <Button 
                onClick={() => setIsModalOpen(false)}
                variant="outline"
              >
                Close Modal
              </Button>
              
              <Button 
                onClick={() => {
                  console.log('🔍 Current state:', {
                    user: testUser,
                    location: testLocation,
                    isModalOpen
                  })
                }}
                variant="outline"
              >
                Log Current State
              </Button>
            </div>
          </div>

          {!testUser && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Authentication Required</h4>
              <p className="text-yellow-700 text-sm">
                You need to be logged in to test the photo submission modal. 
                The modal will not open without a valid user.
              </p>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Debug Instructions:</h4>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Open browser console (F12)</li>
              <li>Click "Open Photo Modal" button</li>
              <li>Check console for debug logs</li>
              <li>Look for logs starting with 🎯, 🔐, 🚫, or ❌</li>
              <li>If modal doesn't open, check what condition is failing</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Photo Submission Modal */}
      <PhotoSubmissionModal
        isOpen={isModalOpen}
        onClose={() => {
          console.log('🔒 Closing photo submission modal')
          setIsModalOpen(false)
        }}
        location={testLocation}
        user={testUser}
        onSuccess={() => {
          console.log('✅ Photo submission success')
          setIsModalOpen(false)
        }}
      />
    </div>
  )
} 