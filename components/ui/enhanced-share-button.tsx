'use client'

import { Button } from '@/components/ui/button'
import { Share2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface EnhancedShareButtonProps {
  locationName: string
  description: string
  locationUrl?: string
  variant?: 'default' | 'ghost' | 'outline' | 'icon'
  size?: 'sm' | 'default' | 'lg' | 'icon'
  className?: string
}

export function EnhancedShareButton({ 
  locationName, 
  description, 
  locationUrl,
  variant = 'default',
  size = 'default',
  className = ''
}: EnhancedShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false)
  
  const shareUrl = locationUrl || (typeof window !== 'undefined' ? window.location.href : '')

  const handleShare = async () => {
    setIsSharing(true)
    
    try {
      // Try native share API first (mobile devices) - only share the URL
      if (navigator.share) {
        await navigator.share({
          url: shareUrl,
        })
        toast.success('Thanks for sharing!')
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Link copied to clipboard!')
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        // If native share failed, try clipboard as fallback
        try {
          await navigator.clipboard.writeText(shareUrl)
          toast.success('Link copied to clipboard!')
        } catch (clipboardError) {
          console.error('Error sharing:', error)
          toast.error('Failed to share')
        }
      }
    } finally {
      setIsSharing(false)
    }
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleShare}
        disabled={isSharing}
        className={className}
      >
        <Share2 className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      disabled={isSharing}
      className={className}
    >
      <Share2 className="h-4 w-4 mr-2" />
      {isSharing ? 'Sharing...' : 'Share'}
    </Button>
  )
} 