"use client"

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ShareButtonProps {
  url: string
  title?: string
  text?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showIcon?: boolean
  children?: React.ReactNode
  onShare?: () => void
}

export default function ShareButton({
  url,
  title = 'Check this out',
  text = 'I found this interesting content',
  variant = 'ghost',
  size = 'sm',
  className,
  showIcon = true,
  children,
  onShare
}: ShareButtonProps) {
  const [isShared, setIsShared] = useState(false)

  const handleShare = async () => {
    try {
      // Try native sharing first (mobile)
      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url,
        })
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(url)
        toast.success("Link copied to clipboard!")
      }

      // Update state
      setIsShared(true)
      
      // Call callback if provided
      onShare?.()

      // Reset state after 2 seconds
      setTimeout(() => setIsShared(false), 2000)

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    } catch (error) {
      console.error("Error sharing:", error)
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error("Failed to share")
      }
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      className={cn(
        "transition-all duration-200",
        isShared && "bg-green-500 text-white hover:bg-green-600",
        className
      )}
    >
      {showIcon && (
        isShared ? (
          <Check className="h-4 w-4 mr-2" />
        ) : (
          <Share2 className="h-4 w-4 mr-2" />
        )
      )}
      {children || (isShared ? 'Shared!' : 'Share')}
    </Button>
  )
} 