"use client"

import Image from "next/image"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FeedErrorStateProps {
  message?: string
  onRetry?: () => void
}

export default function FeedErrorState({
  message = "No posts found. Try refreshing or check back later.",
  onRetry,
}: FeedErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-6">
      <div className="relative w-40 h-40 opacity-80">
        <Image
          src="/empty-feed.svg"
          alt="Empty feed"
          fill
          sizes="(max-width: 640px) 160px, 200px"
          className="object-contain"
          priority
        />
      </div>
      
      <div className="max-w-md space-y-2">
        <h3 className="text-xl font-semibold text-gray-800">
          Feed is empty
        </h3>
        <p className="text-gray-500">
          {message}
        </p>
      </div>
      
      {onRetry && (
        <Button 
          onClick={onRetry}
          variant="outline"
          className="mt-4 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      )}
    </div>
  )
} 