"use client"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"

interface LikeButtonProps {
  isLiked: boolean
  likeCount: number
  onLike?: () => void
  className?: string
}

export function LikeButton({ isLiked, likeCount, onLike, className = "" }: LikeButtonProps) {
  const [isLikedState, setIsLikedState] = useState(isLiked)
  const [likeCountState, setLikeCountState] = useState(likeCount)
  const [isAnimating, setIsAnimating] = useState(false)

  // Update state when props change
  useEffect(() => {
    setIsLikedState(isLiked)
    setLikeCountState(likeCount)
  }, [isLiked, likeCount])

  const handleLike = () => {
    // Update local state for immediate feedback
    const newIsLiked = !isLikedState
    const newLikeCount = newIsLiked ? likeCountState + 1 : likeCountState - 1

    setIsLikedState(newIsLiked)
    setLikeCountState(newLikeCount)

    // Trigger animation if liking (not unliking)
    if (newIsLiked) {
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 800) // Animation duration
    }

    // Call parent handler if provided
    if (onLike) {
      onLike()
    }

    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <button
        className="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-rose-50 active:scale-90"
        onClick={handleLike}
        aria-label={isLikedState ? "Unlike" : "Like"}
        aria-pressed={isLikedState}
      >
        <Heart
          size={24}
          className={cn(
            "transition-all duration-300",
            isLikedState ? "fill-rose-500 text-rose-500" : "text-gray-500",
            isAnimating && "animate-heartbeat",
          )}
        />

        {/* Particle animation */}
        {isAnimating && (
          <span className="absolute inset-0">
            <span className="absolute top-1 left-1/2 w-1 h-1 rounded-full bg-rose-500 animate-particle-1"></span>
            <span className="absolute top-1/4 right-1 w-1 h-1 rounded-full bg-rose-500 animate-particle-2"></span>
            <span className="absolute bottom-1 right-1/4 w-1 h-1 rounded-full bg-rose-500 animate-particle-3"></span>
            <span className="absolute bottom-1/4 left-1 w-1 h-1 rounded-full bg-rose-500 animate-particle-4"></span>
            <span className="absolute top-1/2 left-0 w-1 h-1 rounded-full bg-rose-500 animate-particle-5"></span>
            <span className="absolute top-0 right-1/2 w-1 h-1 rounded-full bg-rose-500 animate-particle-6"></span>
            <span className="absolute bottom-0 left-1/2 w-1 h-1 rounded-full bg-rose-500 animate-particle-7"></span>
            <span className="absolute bottom-1/2 right-0 w-1 h-1 rounded-full bg-rose-500 animate-particle-8"></span>
          </span>
        )}
      </button>
      <div className="flex flex-col items-center mt-1">
        <span className={cn("text-xs font-medium", isLikedState && "text-rose-500")}>{likeCountState}</span>
        <span className="text-xs text-muted-foreground">Like</span>
      </div>
    </div>
  )
}
