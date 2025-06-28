'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, ArrowRight, Clock, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

interface CreatorApplicationButtonProps {
  user?: {
    id: string
    role?: string
    isCreator?: boolean
    creatorProfile?: {
      applicationStatus?: string
    }
  }
  variant?: 'default' | 'outline' | 'ghost' | 'link'
  size?: 'sm' | 'default' | 'lg'
  showStatus?: boolean
  className?: string
}

export default function CreatorApplicationButton({ 
  user, 
  variant = 'default', 
  size = 'default',
  showStatus = false,
  className = ''
}: CreatorApplicationButtonProps) {
  // Don't show if user is already a creator
  if (user?.role === 'creator' || user?.isCreator) {
    return null
  }

  const applicationStatus = user?.creatorProfile?.applicationStatus || 'not_applied'

  // Status-specific content
  const getStatusContent = () => {
    switch (applicationStatus) {
      case 'pending':
        return {
          text: 'Application Pending',
          icon: <Clock className="h-4 w-4" />,
          badge: 'Under Review',
          disabled: true,
          variant: 'outline' as const
        }
      case 'approved':
        return {
          text: 'Application Approved',
          icon: <CheckCircle className="h-4 w-4" />,
          badge: 'Approved',
          disabled: true,
          variant: 'outline' as const
        }
      case 'rejected':
        return {
          text: 'Reapply as Creator',
          icon: <Star className="h-4 w-4" />,
          badge: 'Reapply',
          disabled: false,
          variant: variant
        }
      default:
        return {
          text: 'Become a Creator',
          icon: <Star className="h-4 w-4" />,
          badge: null,
          disabled: false,
          variant: variant
        }
    }
  }

  const statusContent = getStatusContent()

  if (!user) {
    // Not logged in - redirect to login with creator application redirect
    return (
      <Button 
        variant={variant} 
        size={size}
        className={className}
        asChild
      >
        <Link href="/login?redirect=/creator-application">
          <Star className="h-4 w-4 mr-2" />
          Become a Creator
          <ArrowRight className="h-4 w-4 ml-2" />
        </Link>
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant={statusContent.variant} 
        size={size}
        className={className}
        disabled={statusContent.disabled}
        asChild={!statusContent.disabled}
      >
        {statusContent.disabled ? (
          <div className="flex items-center">
            {statusContent.icon}
            <span className="ml-2">{statusContent.text}</span>
          </div>
        ) : (
          <Link href="/creator-application" className="flex items-center">
            {statusContent.icon}
            <span className="ml-2">{statusContent.text}</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        )}
      </Button>
      
      {showStatus && statusContent.badge && (
        <Badge 
          variant={
            applicationStatus === 'pending' ? 'secondary' : 
            applicationStatus === 'approved' ? 'default' : 
            'destructive'
          }
        >
          {statusContent.badge}
        </Badge>
      )}
    </div>
  )
}

// Compact version for footer
export function CreatorApplicationLink({ 
  user,
  className = "text-sm text-gray-600 hover:text-gray-900 transition-colors"
}: Pick<CreatorApplicationButtonProps, 'user' | 'className'>) {
  // Don't show if user is already a creator
  if (user?.role === 'creator' || user?.isCreator) {
    return null
  }

  const applicationStatus = user?.creatorProfile?.applicationStatus || 'not_applied'

  const getLinkText = () => {
    switch (applicationStatus) {
      case 'pending':
        return 'Application Status'
      case 'rejected':
        return 'Reapply as Creator'
      default:
        return 'Become a Creator'
    }
  }

  const href = user ? '/creator-application' : '/login?redirect=/creator-application'

  return (
    <Link href={href} className={className}>
      {getLinkText()}
    </Link>
  )
} 