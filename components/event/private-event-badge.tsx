"use client"

import { Badge } from '@/components/ui/badge'
import { Lock, Globe } from 'lucide-react'

interface PrivateEventBadgeProps {
  privacy: 'public' | 'private'
  className?: string
}

export default function PrivateEventBadge({ privacy, className = "" }: PrivateEventBadgeProps) {
  if (privacy === 'private') {
    return (
      <Badge variant="outline" className={`border-orange-200 text-orange-700 bg-orange-50 ${className}`}>
        <Lock className="h-3 w-3 mr-1" />
        Private Event
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={`border-green-200 text-green-700 bg-green-50 ${className}`}>
      <Globe className="h-3 w-3 mr-1" />
      Public Event
    </Badge>
  )
} 