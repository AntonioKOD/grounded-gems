"use client"

import { Globe, Users, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface PrivateLocationBadgeProps {
  privacy: 'public' | 'private'
  privateAccessCount?: number
  className?: string
}

export default function PrivateLocationBadge({
  privacy,
  privateAccessCount = 0,
  className = ""
}: PrivateLocationBadgeProps) {
  if (privacy === 'public') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`border-green-200 text-green-700 bg-green-50 ${className}`}
            >
              <Globe className="h-3 w-3 mr-1" />
              Public
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>This location is visible to everyone</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`border-blue-200 text-blue-700 bg-blue-50 ${className}`}
          >
            <Lock className="h-3 w-3 mr-1" />
            Private
            {privateAccessCount > 0 && (
              <span className="ml-1 text-xs">
                ({privateAccessCount})
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            This location is private and only visible to {privateAccessCount} selected friend{privateAccessCount !== 1 ? 's' : ''}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 