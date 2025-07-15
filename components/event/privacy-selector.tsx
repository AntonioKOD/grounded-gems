"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Lock, Globe, Users } from 'lucide-react'
import PrivateAccessSelector from '@/components/location/private-access-selector'

interface PrivacySelectorProps {
  privacy: 'public' | 'private'
  onPrivacyChange: (privacy: 'public' | 'private') => void
  privateAccess: string[]
  onPrivateAccessChange: (userIds: string[]) => void
  currentUserId: string
  className?: string
}

export default function PrivacySelector({
  privacy,
  onPrivacyChange,
  privateAccess,
  onPrivateAccessChange,
  currentUserId,
  className = ""
}: PrivacySelectorProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Event Privacy</CardTitle>
          <CardDescription>
            Choose who can see and join this event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={privacy}
            onValueChange={(value) => onPrivacyChange(value as 'public' | 'private')}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="public" id="public" />
              <Label htmlFor="public" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Globe className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      Public Event
                      <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
                        <Globe className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Anyone can see and join this event
                    </p>
                  </div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="private" id="private" />
              <Label htmlFor="private" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Lock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      Private Event
                      <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">
                        <Lock className="h-3 w-3 mr-1" />
                        Private
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Only selected friends can see and join this event
                    </p>
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {privacy === 'private' && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-orange-600" />
                <h4 className="font-medium text-orange-900">Select Friends</h4>
              </div>
              <p className="text-sm text-orange-700 mb-3">
                Choose which friends can see and join this private event
              </p>
              <PrivateAccessSelector
                currentAccess={privateAccess}
                onAccessChange={onPrivateAccessChange}
                userId={currentUserId}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 