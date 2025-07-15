"use client"

import { useState, useEffect } from 'react'
import { Search, Users, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'

interface Friend {
  id: string
  name: string
  username?: string
  profileImage?: {
    url: string
  }
  avatar?: string
}

interface PrivateAccessSelectorProps {
  currentAccess: string[]
  onAccessChange: (userIds: string[]) => void
  userId: string
  className?: string
}

export default function PrivateAccessSelector({
  currentAccess,
  onAccessChange,
  userId,
  className = ""
}: PrivateAccessSelectorProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set(currentAccess))

  useEffect(() => {
    fetchFriends()
  }, [userId])

  // Initialize selected friends from currentAccess prop
  useEffect(() => {
    setSelectedFriends(new Set(currentAccess))
  }, [currentAccess])



  const fetchFriends = async () => {
    try {
      setLoading(true)
      console.log('Fetching friends for userId:', userId)
      
      if (!userId || userId === 'test-user') {
        console.log('Using mock friends data for test user')
        setFriends([
          {
            id: 'mock-friend-1',
            name: 'John Doe',
            username: 'johndoe',
            profileImage: undefined,
            avatar: undefined
          },
          {
            id: 'mock-friend-2', 
            name: 'Jane Smith',
            username: 'janesmith',
            profileImage: undefined,
            avatar: undefined
          }
        ])
        setLoading(false)
        return
      }
      
      const response = await fetch(`/api/users/friends?userId=${userId}`)
      console.log('Friends API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Friends API response data:', data)
        setFriends(data.friends || [])
      } else {
        console.error('Failed to fetch friends:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error details:', errorData)
        
        // For testing, use mock data if API fails
        if (process.env.NODE_ENV === 'development') {
          console.log('Using mock friends data for testing')
          setFriends([
            {
              id: 'mock-friend-1',
              name: 'John Doe',
              username: 'johndoe',
              profileImage: undefined,
              avatar: undefined
            },
            {
              id: 'mock-friend-2', 
              name: 'Jane Smith',
              username: 'janesmith',
              profileImage: undefined,
              avatar: undefined
            }
          ])
        } else {
          toast.error('Failed to load friends')
        }
      }
    } catch (error) {
      console.error('Error fetching friends:', error)
      // For testing, use mock data if API fails
      if (process.env.NODE_ENV === 'development') {
        console.log('Using mock friends data for testing')
        setFriends([
          {
            id: 'mock-friend-1',
            name: 'John Doe',
            username: 'johndoe',
            profileImage: undefined,
            avatar: undefined
          },
          {
            id: 'mock-friend-2', 
            name: 'Jane Smith',
            username: 'janesmith',
            profileImage: undefined,
            avatar: undefined
          }
        ])
      } else {
        toast.error('Failed to load friends')
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleFriend = (friendId: string) => {
    const newSelected = new Set(selectedFriends)
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId)
    } else {
      newSelected.add(friendId)
    }
    setSelectedFriends(newSelected)
    // Update parent immediately when selection changes
    onAccessChange(Array.from(newSelected))
  }

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.username?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const getProfileImageUrl = (friend: Friend) => {
    return friend.profileImage?.url || friend.avatar || '/placeholder.svg'
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Friends for Private Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Select Friends for Private Access
        </CardTitle>
        <p className="text-sm text-gray-600">
          Choose which friends can see this private content
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search friends..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Selected count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {selectedFriends.size} friend{selectedFriends.size !== 1 ? 's' : ''} selected
          </span>
          {selectedFriends.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFriends(new Set())
                onAccessChange([])
              }}
              className="text-red-600 hover:text-red-700"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Friends list */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredFriends.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">
                {searchTerm ? 'No friends found matching your search' : 'No friends found'}
              </p>
              {!searchTerm && (
                <div className="text-xs mt-2 space-y-1">
                  <p>You need to follow people to share private events with them</p>
                  <p className="text-gray-400">Follow some users first, then come back to create private events</p>
                  <div className="mt-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('/explorer', '_blank')}
                      className="text-xs"
                    >
                      Find People to Follow
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            filteredFriends.map((friend) => {
              const isSelected = selectedFriends.has(friend.id)
              return (
                <div
                  key={friend.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-blue-200 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleFriend(friend.id)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={getProfileImageUrl(friend)} 
                      alt={friend.name} 
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                      {getInitials(friend.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {friend.name}
                      </span>
                      {isSelected && (
                        <UserCheck className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    {friend.username && (
                      <p className="text-sm text-gray-500 truncate">
                        @{friend.username}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <Badge variant="default" className="bg-blue-100 text-blue-700">
                        Selected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        Select
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Help text */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
          <p className="mb-1">
            <strong>How private locations work:</strong>
          </p>
          <ul className="space-y-1">
            <li>• Only selected friends can see this location</li>
            <li>• You can change access anytime</li>
            <li>• Friends won't be notified automatically</li>
            <li>• You can still share the location link directly</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
} 