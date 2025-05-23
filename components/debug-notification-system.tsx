'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createTestNotification, debugNotificationSystem, createMultipleTestNotifications } from '@/app/actions'
import { toast } from 'sonner'

interface DebugNotificationSystemProps {
  userId?: string
}

export default function DebugNotificationSystem({ userId }: DebugNotificationSystemProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<unknown>(null)

  const handleDebugSystem = async () => {
    setIsLoading(true)
    try {
      const result = await debugNotificationSystem()
      if (result.success) {
        toast.success(result.message)
        setDebugInfo(result.details)
      } else {
        toast.error(result.message)
        setDebugInfo(result.details)
      }
    } catch (error) {
      console.error('Error debugging system:', error)
      toast.error('Failed to debug notification system')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestNotification = async () => {
    if (!userId) {
      toast.error('User ID required for test notification')
      return
    }

    setIsLoading(true)
    try {
      const result = await createTestNotification(userId)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error testing notification:', error)
      toast.error('Failed to create test notification')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateMultipleNotifications = async () => {
    if (!userId) {
      toast.error('User ID required for test notifications')
      return
    }

    setIsLoading(true)
    try {
      const result = await createMultipleTestNotifications(userId)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error creating test notifications:', error)
      toast.error('Failed to create test notifications')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Notification System Debug</CardTitle>
        <CardDescription>
          Debug and test the notification system functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleDebugSystem}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? 'Debugging...' : 'Debug System'}
          </Button>
          
          {userId && (
            <>
              <Button 
                onClick={handleTestNotification}
                disabled={isLoading}
                variant="secondary"
              >
                {isLoading ? 'Testing...' : 'Create 1 Test Notification'}
              </Button>
              
              <Button 
                onClick={handleCreateMultipleNotifications}
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create 5 Test Notifications'}
              </Button>
            </>
          )}
        </div>

        {debugInfo && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Debug Results:</h4>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        {!userId && (
          <p className="text-sm text-gray-500">
            Please log in to test notifications
          </p>
        )}
      </CardContent>
    </Card>
  )
} 