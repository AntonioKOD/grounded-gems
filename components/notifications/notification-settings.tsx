'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Bell, 
  BellOff, 
  Heart, 
  Star, 
  Calendar, 
  Trophy, 
  Users, 
  MapPin, 
  Tag,
  Info,
  Check,
  X,
  Volume2,
  VolumeX,
  Settings,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getNotificationPreferences,
  saveNotificationPreferences,
  showTestNotification,
  initializeNotifications
} from '@/lib/notifications'

interface NotificationPreferences {
  enabled: boolean
  locationActivities: boolean
  eventRequests: boolean
  milestones: boolean
  friendActivities: boolean
  proximityAlerts: boolean
  specialOffers: boolean
}

export default function NotificationSettings() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    locationActivities: true,
    eventRequests: true,
    milestones: true,
    friendActivities: true,
    proximityAlerts: false,
    specialOffers: true,
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check browser support and permission status
    setSupported(isNotificationSupported())
    if (isNotificationSupported()) {
      setPermission(getNotificationPermission())
      setPreferences(getNotificationPreferences())
    }
  }, [])

  const handleRequestPermission = async () => {
    setIsLoading(true)
    try {
      const newPermission = await requestNotificationPermission()
      setPermission(newPermission)
      
      if (newPermission === 'granted') {
        toast.success('Notifications enabled successfully!')
        await showTestNotification()
      } else {
        toast.error('Notification permission denied')
      }
    } catch (error) {
      console.error('Error requesting permission:', error)
      toast.error('Failed to request notification permission')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInitializeNotifications = async () => {
    setIsLoading(true)
    try {
      const success = await initializeNotifications()
      if (success) {
        setPermission('granted')
        setPreferences({ ...preferences, enabled: true })
        toast.success('Notifications initialized successfully!')
      } else {
        toast.error('Failed to initialize notifications')
      }
    } catch (error) {
      console.error('Error initializing notifications:', error)
      toast.error('Failed to initialize notifications')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    saveNotificationPreferences(newPreferences)
    
    if (key === 'enabled') {
      toast.success(value ? 'Notifications enabled' : 'Notifications disabled')
    } else {
      toast.success('Preferences updated')
    }
  }

  const handleTestNotification = async () => {
    try {
      if (permission !== 'granted') {
        toast.error('Please enable notifications first')
        return
      }
      
      await showTestNotification()
      toast.success('Test notification sent!')
    } catch (error) {
      console.error('Error sending test notification:', error)
      toast.error('Failed to send test notification')
    }
  }

  const handleTestPushNotification = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'This is a test push notification from the server!'
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success('Push notification sent successfully!')
      } else {
        toast.error(result.error || 'Failed to send push notification')
      }
    } catch (error) {
      console.error('Error sending push notification:', error)
      toast.error('Failed to send push notification')
    } finally {
      setIsLoading(false)
    }
  }

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { status: 'Enabled', color: 'bg-green-500', icon: Check }
      case 'denied':
        return { status: 'Blocked', color: 'bg-red-500', icon: X }
      case 'default':
        return { status: 'Not requested', color: 'bg-gray-500', icon: Info }
      default:
        return { status: 'Unknown', color: 'bg-gray-500', icon: Info }
    }
  }

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Browser Notifications
          </CardTitle>
          <CardDescription>
            Manage your notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your browser doesn't support notifications or you're using an insecure connection. 
              Notifications require HTTPS to work properly.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const permissionInfo = getPermissionStatus()
  const PermissionIcon = permissionInfo.icon

  return (
    <div className="space-y-6">
      {/* Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Browser Notifications
          </CardTitle>
          <CardDescription>
            Manage your notification preferences and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Permission Status:</span>
              <Badge className={`${permissionInfo.color} text-white`}>
                <PermissionIcon className="h-3 w-3 mr-1" />
                {permissionInfo.status}
              </Badge>
            </div>
            
            {permission !== 'granted' && (
              <Button 
                onClick={permission === 'default' ? handleInitializeNotifications : handleRequestPermission}
                disabled={isLoading}
              >
                {permission === 'default' ? 'Enable Notifications' : 'Request Permission'}
              </Button>
            )}
            
            {permission === 'granted' && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleTestNotification}
                >
                  Test Browser Notification
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleTestPushNotification}
                  disabled={isLoading}
                >
                  Test Push Notification
                </Button>
              </div>
            )}
          </div>

          {permission === 'denied' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Notifications are blocked. To enable them, click the notification icon in your browser's address bar 
                or go to your browser's site settings.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      {permission === 'granted' && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose which types of notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Master Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">All Notifications</Label>
                <p className="text-sm text-gray-600">
                  Control what types of notifications you&apos;d like to receive. You can change these settings at any time.
                </p>
              </div>
              <Switch
                checked={preferences.enabled}
                onCheckedChange={(checked) => handlePreferenceChange('enabled', checked)}
              />
            </div>

            <Separator />

            {/* Individual Preferences */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-red-500" />
                  <div className="space-y-0.5">
                    <Label>Location Activities</Label>
                    <p className="text-sm text-gray-500">
                      Likes, reviews, check-ins, and saves on your locations
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.locationActivities}
                  onCheckedChange={(checked) => handlePreferenceChange('locationActivities', checked)}
                  disabled={!preferences.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div className="space-y-0.5">
                    <Label>Event Requests</Label>
                    <p className="text-sm text-gray-500">
                      New event requests for your locations
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.eventRequests}
                  onCheckedChange={(checked) => handlePreferenceChange('eventRequests', checked)}
                  disabled={!preferences.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <div className="space-y-0.5">
                    <Label>Milestones</Label>
                    <p className="text-sm text-gray-500">
                      When your locations reach like, visit, or review milestones
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.milestones}
                  onCheckedChange={(checked) => handlePreferenceChange('milestones', checked)}
                  disabled={!preferences.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-green-500" />
                  <div className="space-y-0.5">
                    <Label>Friend Activities</Label>
                    <p className="text-sm text-gray-500">
                      When friends check in or interact with locations
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.friendActivities}
                  onCheckedChange={(checked) => handlePreferenceChange('friendActivities', checked)}
                  disabled={!preferences.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-purple-500" />
                  <div className="space-y-0.5">
                    <Label>Proximity Alerts</Label>
                    <p className="text-sm text-gray-500">
                      When you're near interesting locations (requires location access)
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.proximityAlerts}
                  onCheckedChange={(checked) => handlePreferenceChange('proximityAlerts', checked)}
                  disabled={!preferences.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Tag className="h-5 w-5 text-orange-500" />
                  <div className="space-y-0.5">
                    <Label>Special Offers & Trending</Label>
                    <p className="text-sm text-gray-500">
                      Special offers, trending locations, and promotional content
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.specialOffers}
                  onCheckedChange={(checked) => handlePreferenceChange('specialOffers', checked)}
                  disabled={!preferences.enabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How Notifications Work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• Notifications appear outside the browser when the site is not active</p>
          <p>• Click notifications to navigate directly to relevant content</p>
          <p>• Notifications automatically disappear after 10 seconds (except event requests)</p>
          <p>• You can disable notifications at any time in your browser settings</p>
        </CardContent>
      </Card>
    </div>
  )
} 