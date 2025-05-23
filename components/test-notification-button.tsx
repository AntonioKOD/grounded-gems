'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createTestNotification } from '@/app/actions'
import { toast } from 'sonner'

interface TestNotificationButtonProps {
  userId: string
}

export default function TestNotificationButton({ userId }: TestNotificationButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleTestNotification = async () => {
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

  return (
    <Button 
      onClick={handleTestNotification}
      disabled={isLoading}
      variant="outline"
      size="sm"
    >
      {isLoading ? 'Testing...' : 'Test Notifications'}
    </Button>
  )
} 