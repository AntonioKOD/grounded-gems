"use client"

import { useState } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LikeButtonProps {
  isLiked: boolean
  likeCount: number
  onLike: () => void
  size?: "sm" | "md" | "lg"
  className?: string
  showCount?: boolean
  disabled?: boolean
}

export function LikeButton({
  isLiked,
  likeCount,
  onLike,
  size = "md",
  className,
  showCount = true,
  disabled = false,
}: LikeButtonProps) {
  const [isHovering, setIsHovering] = useState(false)

  // Size mappings
  const sizeClasses = {
    sm: "h-8 px-2 text-xs",
    md: "h-9 px-3 text-sm",
    lg: "h-10 px-4 text-base",
  }

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "flex items-center gap-1.5 transition-all duration-200 group",
        isLiked
          ? "text-red-500 hover:text-red-600 bg-red-50/50 hover:bg-red-100/60"
          : "hover:text-red-500 hover:bg-red-50/50",
        sizeClasses[size],
        className,
      )}
      onClick={onLike}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      disabled={disabled}
    >
      <Heart
        className={cn(
          iconSizes[size],
          "transition-all duration-300",
          isLiked ? "fill-red-500 scale-110" : isHovering ? "scale-110" : "scale-100",
        )}
      />
      {showCount && (
        <span className={cn("transition-all duration-200", isLiked ? "font-medium" : "")}>{likeCount || 0}</span>
      )}
    </Button>
  )
}
