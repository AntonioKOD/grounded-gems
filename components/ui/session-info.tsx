"use client"

import { useEffect, useState } from 'react'
import { Clock, Shield, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { RememberMeHelper } from '@/lib/auth-utils'

interface SessionInfoProps {
  className?: string
  showDetailed?: boolean
}

export default function SessionInfo({ className = "", showDetailed = false }: SessionInfoProps) {
  const [sessionInfo, setSessionInfo] = useState<{
    isRemembered: boolean
    expiryHours: number
    savedEmail?: string | null
  } | null>(null)

  useEffect(() => {
    const info = RememberMeHelper.getSessionInfo()
    setSessionInfo({
      ...info,
      savedEmail: RememberMeHelper.getSavedEmail()
    })
  }, [])

  if (!sessionInfo || !showDetailed) return null

  return (
    <Alert className={`border-blue-200 bg-blue-50 ${className}`}>
      <Shield className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">Session Status:</span>
            <Badge variant={sessionInfo.isRemembered ? "default" : "secondary"} className="text-xs">
              {sessionInfo.isRemembered ? "Extended (30 days)" : "Standard (24 hours)"}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <Clock className="h-3 w-3" />
            <span>{sessionInfo.expiryHours}h session</span>
          </div>
        </div>
        {sessionInfo.isRemembered && sessionInfo.savedEmail && (
          <div className="mt-2 text-xs text-blue-600">
            <Info className="h-3 w-3 inline mr-1" />
            Email saved for quick login: {sessionInfo.savedEmail}
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
} 