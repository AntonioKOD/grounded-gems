'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, Loader2, Star, CheckCircle, AlertCircle } from 'lucide-react'

export default function TestNotificationTrigger() {
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatorLoading, setIsCreatorLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [creatorMessage, setCreatorMessage] = useState('')

  const triggerTestNotification = async () => {
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'test',
          title: 'Test Notification',
          message: 'This is a test notification triggered manually',
          priority: 'normal'
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage('✅ Test notification sent successfully!')
      } else {
        setMessage(`❌ Failed to send notification: ${result.error}`)
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      setMessage('❌ Error sending test notification')
    } finally {
      setIsLoading(false)
    }
  }

  const testCreatorApplicationStatus = async () => {
    setIsCreatorLoading(true)
    setCreatorMessage('')
    
    try {
      const response = await fetch('/api/creator-application', {
        method: 'GET',
        credentials: 'include',
      })

      const result = await response.json()
      
      if (result.success) {
        setCreatorMessage(`✅ Creator application status: ${result.status}${result.hasApplication ? ` (Application ID: ${result.application?.id})` : ''}`)
      } else {
        setCreatorMessage(`❌ Failed to get creator status: ${result.error}`)
      }
    } catch (error) {
      console.error('Error getting creator status:', error)
      setCreatorMessage('❌ Error getting creator application status')
    } finally {
      setIsCreatorLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Test Components
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notification Test */}
        <div className="space-y-2">
          <Button 
            onClick={triggerTestNotification}
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Send Test Notification
              </>
            )}
          </Button>
          
          {message && (
            <div className={`text-sm p-2 rounded ${
              message.startsWith('✅') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}
        </div>

        {/* Creator Application Test */}
        <div className="space-y-2">
          <Button 
            onClick={testCreatorApplicationStatus}
            disabled={isCreatorLoading}
            className="w-full"
            variant="outline"
          >
            {isCreatorLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Check Creator Status
              </>
            )}
          </Button>
          
          {creatorMessage && (
            <div className={`text-sm p-2 rounded ${
              creatorMessage.startsWith('✅') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {creatorMessage}
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 text-center">
          This component is for testing purposes only
        </div>
      </CardContent>
    </Card>
  )
} 