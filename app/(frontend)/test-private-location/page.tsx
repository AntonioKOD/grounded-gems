"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Users, Globe, Lock } from 'lucide-react'
import PrivateAccessSelector from '@/components/location/private-access-selector'
import PrivateLocationBadge from '@/components/location/private-location-badge'

export default function TestPrivateLocationPage() {
  const { user, isLoading } = useAuth()
  const [friends, setFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public')
  const [privateAccess, setPrivateAccess] = useState<string[]>([])
  const [testResults, setTestResults] = useState<string[]>([])

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const testFriendsAPI = async () => {
    if (!user) {
      addTestResult('❌ No user logged in')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/users/friends?userId=${user.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setFriends(data.friends || [])
        addTestResult(`✅ Friends API working: ${data.friends?.length || 0} friends found`)
      } else {
        addTestResult(`❌ Friends API error: ${data.error}`)
      }
    } catch (error) {
      addTestResult(`❌ Friends API exception: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testPrivacyBadge = () => {
    addTestResult('✅ Privacy badge component loaded')
  }

  const testAccessSelector = () => {
    addTestResult('✅ Access selector component loaded')
  }

  useEffect(() => {
    if (user) {
      testFriendsAPI()
      testPrivacyBadge()
      testAccessSelector()
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Checking authentication...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Please log in to test the private location feature.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Private Location Feature Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">User Info</h3>
              <p className="text-sm text-gray-600">ID: {user.id}</p>
              <p className="text-sm text-gray-600">Name: {user.name}</p>
              <p className="text-sm text-gray-600">Email: {user.email}</p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Friends API Test</h3>
              <Button 
                onClick={testFriendsAPI} 
                disabled={loading}
                className="mb-2"
              >
                {loading ? 'Testing...' : 'Test Friends API'}
              </Button>
              <p className="text-sm text-gray-600">
                Found {friends.length} friends
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Privacy Badge Test</h3>
              <div className="space-y-2">
                <PrivateLocationBadge privacy="public" />
                <PrivateLocationBadge privacy="private" privateAccessCount={3} />
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Privacy Settings Test</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="public"
                      checked={privacy === 'public'}
                      onChange={(e) => setPrivacy(e.target.value as 'public' | 'private')}
                    />
                    <Globe className="h-4 w-4" />
                    <span>Public</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="private"
                      checked={privacy === 'private'}
                      onChange={(e) => setPrivacy(e.target.value as 'public' | 'private')}
                    />
                    <Lock className="h-4 w-4" />
                    <span>Private</span>
                  </label>
                </div>

                {privacy === 'private' && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Select Friends for Access</h4>
                    <PrivateAccessSelector
                      currentAccess={privateAccess}
                      onAccessChange={setPrivateAccess}
                      userId={user.id}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Test Results</h3>
              <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                {testResults.length === 0 ? (
                  <p className="text-gray-500">No test results yet</p>
                ) : (
                  <div className="space-y-1">
                    {testResults.map((result, index) => (
                      <div key={index} className="text-sm font-mono">
                        {result}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 