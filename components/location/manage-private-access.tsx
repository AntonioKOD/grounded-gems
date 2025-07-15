"use client"

import { useState } from 'react'
import { Users, Settings, Globe, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import PrivateAccessSelector from './private-access-selector'

interface ManagePrivateAccessProps {
  locationId: string
  currentPrivacy: 'public' | 'private'
  currentPrivateAccess: string[]
  userId: string
  onPrivacyChange: (privacy: 'public' | 'private', privateAccess: string[]) => Promise<void>
  className?: string
}

export default function ManagePrivateAccess({
  locationId,
  currentPrivacy,
  currentPrivateAccess,
  userId,
  onPrivacyChange,
  className = ""
}: ManagePrivateAccessProps) {
  const [privacy, setPrivacy] = useState<'public' | 'private'>(currentPrivacy)
  const [privateAccess, setPrivateAccess] = useState<string[]>(currentPrivateAccess)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showAccessSelector, setShowAccessSelector] = useState(false)

  const handlePrivacyChange = async (newPrivacy: 'public' | 'private') => {
    setPrivacy(newPrivacy)
    
    if (newPrivacy === 'public') {
      // Clear private access when switching to public
      setPrivateAccess([])
    } else if (newPrivacy === 'private' && privateAccess.length === 0) {
      // Show access selector when switching to private with no access set
      setShowAccessSelector(true)
    }
  }

  const handleSaveChanges = async () => {
    if (privacy === 'private' && privateAccess.length === 0) {
      toast.error('Please select at least one friend for private access')
      return
    }

    setIsUpdating(true)
    try {
      await onPrivacyChange(privacy, privateAccess)
      toast.success('Privacy settings updated successfully')
      setShowAccessSelector(false)
    } catch (error) {
      console.error('Error updating privacy settings:', error)
      toast.error('Failed to update privacy settings')
    } finally {
      setIsUpdating(false)
    }
  }

  const hasChanges = privacy !== currentPrivacy || 
    JSON.stringify(privateAccess.sort()) !== JSON.stringify(currentPrivateAccess.sort())

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Privacy Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50">
          <Globe className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Control who can see this location. Private locations are only visible to selected friends.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Location Visibility</label>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  id="privacy-public"
                  name="privacy"
                  value="public"
                  checked={privacy === 'public'}
                  onChange={() => handlePrivacyChange('public')}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-600"
                />
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-green-600" />
                  <div>
                    <label htmlFor="privacy-public" className="text-sm font-medium cursor-pointer">
                      Public Location
                    </label>
                    <p className="text-xs text-gray-600">
                      Visible to everyone on the platform
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  id="privacy-private"
                  name="privacy"
                  value="private"
                  checked={privacy === 'private'}
                  onChange={() => handlePrivacyChange('private')}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-600"
                />
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-blue-600" />
                  <div>
                    <label htmlFor="privacy-private" className="text-sm font-medium cursor-pointer">
                      Private Location
                    </label>
                    <p className="text-xs text-gray-600">
                      Only visible to selected friends
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {privacy === 'private' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Private Access</label>
                <Badge variant="outline" className="text-xs">
                  {privateAccess.length} friend{privateAccess.length !== 1 ? 's' : ''} selected
                </Badge>
              </div>

              {privateAccess.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-2">
                    This location is currently shared with {privateAccess.length} friend{privateAccess.length !== 1 ? 's' : ''}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAccessSelector(true)}
                    className="text-xs"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Manage Access
                  </Button>
                </div>
              )}

              {privateAccess.length === 0 && (
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <p className="text-xs text-orange-800">
                    No friends selected. This location will only be visible to you.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAccessSelector(true)}
                    className="text-xs mt-2"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    Select Friends
                  </Button>
                </div>
              )}
            </div>
          )}

          {showAccessSelector && (
            <div className="border-t pt-4">
              <PrivateAccessSelector
                currentAccess={privateAccess}
                onAccessChange={setPrivateAccess}
                userId={userId}
                className="w-full"
              />
            </div>
          )}

          {hasChanges && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleSaveChanges}
                disabled={isUpdating}
                className="flex-1"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPrivacy(currentPrivacy)
                  setPrivateAccess(currentPrivateAccess)
                  setShowAccessSelector(false)
                }}
                disabled={isUpdating}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 