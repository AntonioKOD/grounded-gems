"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Lock, Globe, Users, Calendar, MapPin } from 'lucide-react'
import PrivateEventBadge from '@/components/event/private-event-badge'
import PrivacySelector from '@/components/event/privacy-selector'
import LocationSearch from '@/components/event/location-search'
import { toast } from 'sonner'

interface Location {
  id: string
  name: string
  description?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  }
  featuredImage?: {
    url: string
  }
  categories?: Array<{
    name: string
  }>
}

export default function TestPrivateEventPage() {
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public')
  const [privateAccess, setPrivateAccess] = useState<string[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [friends, setFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  // Fetch friends for testing
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        // First get the current user
        const userResponse = await fetch('/api/auth/me')
        if (userResponse.ok) {
          const userData = await userResponse.json()
          const currentUserId = userData.user?.id
          
          if (currentUserId) {
            console.log('Current user ID:', currentUserId)
            setCurrentUserId(currentUserId)
            const response = await fetch(`/api/users/friends?userId=${currentUserId}`)
            console.log('Friends API response status:', response.status)
            
            if (response.ok) {
              const data = await response.json()
              console.log('Friends API response data:', data)
              setFriends(data.friends || [])
            } else {
              console.error('Failed to fetch friends')
              const errorData = await response.json().catch(() => ({}))
              console.error('Error details:', errorData)
              // Mock data for testing
              setFriends([
                { id: '1', name: 'John Doe', email: 'john@example.com', avatar: null },
                { id: '2', name: 'Jane Smith', email: 'jane@example.com', avatar: null },
                { id: '3', name: 'Bob Johnson', email: 'bob@example.com', avatar: null },
              ])
            }
          } else {
            console.error('No current user found')
            // Mock data for testing
            setFriends([
              { id: '1', name: 'John Doe', email: 'john@example.com', avatar: null },
              { id: '2', name: 'Jane Smith', email: 'jane@example.com', avatar: null },
              { id: '3', name: 'Bob Johnson', email: 'bob@example.com', avatar: null },
            ])
          }
        } else {
          console.error('Failed to get current user')
          // Mock data for testing
          setFriends([
            { id: '1', name: 'John Doe', email: 'john@example.com', avatar: null },
            { id: '2', name: 'Jane Smith', email: 'jane@example.com', avatar: null },
            { id: '3', name: 'Bob Johnson', email: 'bob@example.com', avatar: null },
          ])
        }
      } catch (error) {
        console.error('Error fetching friends:', error)
        // Mock data for testing
        setFriends([
          { id: '1', name: 'John Doe', email: 'john@example.com', avatar: null },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com', avatar: null },
          { id: '3', name: 'Bob Johnson', email: 'bob@example.com', avatar: null },
        ])
      }
    }

    fetchFriends()
  }, [])

  const handleCreateEvent = async () => {
    setLoading(true)
    
    // Simulate event creation
    setTimeout(() => {
      toast.success(`Event created successfully! Privacy: ${privacy}`)
      if (privacy === 'private') {
        toast.info(`Private event shared with ${privateAccess.length} friends`)
      }
      setLoading(false)
    }, 2000)
  }

  const getAddressString = (location: Location) => {
    if (!location.address) return ''
    const { street, city, state, zip, country } = location.address
    const parts = [street, city, state, zip, country].filter(Boolean)
    return parts.join(', ')
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test Private Event Feature</h1>
        <p className="text-gray-600">
          Test the private event functionality with privacy controls and location search.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Event Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Privacy Selector */}
            <PrivacySelector
              privacy={privacy}
              onPrivacyChange={setPrivacy}
              privateAccess={privateAccess}
              onPrivateAccessChange={setPrivateAccess}
              currentUserId={currentUserId || "test-user"}
            />
            
            {/* Debug info */}
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <p><strong>Debug Info:</strong></p>
              <p>Current User ID: {currentUserId || 'Not set'}</p>
              <p>Friends Count: {friends.length}</p>
              <p>Privacy: {privacy}</p>
              <p>Private Access Count: {privateAccess.length}</p>
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/users/friends/debug')
                      const data = await response.json()
                      console.log('Debug API response:', data)
                      alert(JSON.stringify(data, null, 2))
                    } catch (error) {
                      console.error('Debug API error:', error)
                      alert('Error calling debug API')
                    }
                  }}
                  className="text-xs"
                >
                  Test Auth & Friends API
                </Button>
              </div>
            </div>

            {/* Location Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <LocationSearch
                onLocationSelect={setSelectedLocation}
                selectedLocation={selectedLocation}
              />
            </div>

            {/* Create Button */}
            <Button 
              onClick={handleCreateEvent} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Creating Event...' : 'Create Test Event'}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Event Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Privacy Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Privacy:</span>
              <PrivateEventBadge privacy={privacy} />
            </div>

            {/* Location Preview */}
            {selectedLocation && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={selectedLocation.featuredImage?.url} 
                      alt={selectedLocation.name} 
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                      {getInitials(selectedLocation.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium">{selectedLocation.name}</h4>
                    {getAddressString(selectedLocation) && (
                      <p className="text-sm text-gray-600">{getAddressString(selectedLocation)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Private Access List */}
            {privacy === 'private' && privateAccess.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">Private Access ({privateAccess.length})</span>
                </div>
                <div className="space-y-2">
                  {friends
                    .filter(friend => privateAccess.includes(friend.id))
                    .map(friend => (
                      <div key={friend.id} className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={friend.avatar} alt={friend.name} />
                          <AvatarFallback className="text-xs">
                            {getInitials(friend.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{friend.name}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Event Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Sample Event</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  {selectedLocation ? selectedLocation.name : 'No location selected'}
                </span>
              </div>
            </div>

            {/* Privacy Info */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                {privacy === 'private' ? (
                  <Lock className="h-4 w-4 text-blue-600 mt-0.5" />
                ) : (
                  <Globe className="h-4 w-4 text-green-600 mt-0.5" />
                )}
                <div className="text-sm">
                  <p className="font-medium">
                    {privacy === 'private' ? 'Private Event' : 'Public Event'}
                  </p>
                  <p className="text-gray-600">
                    {privacy === 'private' 
                      ? `Only selected friends can see this event`
                      : 'Anyone can see and join this event'
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Privacy Setting:</span>
                <Badge variant="outline" className="ml-2">
                  {privacy}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Private Access:</span>
                <span className="ml-2">{privateAccess.length} friends</span>
              </div>
              <div>
                <span className="font-medium">Location Selected:</span>
                <span className="ml-2">{selectedLocation ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="font-medium">Friends Available:</span>
                <span className="ml-2">{friends.length}</span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Test Instructions:</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Try switching between public and private privacy</li>
                <li>• Select friends for private access when privacy is set to private</li>
                <li>• Search for a location using the location search</li>
                <li>• Click "Create Test Event" to see the privacy controls in action</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 