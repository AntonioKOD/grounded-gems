import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function MobileFeedSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 2 }).map((_, index) => (
        <Card key={index} className="relative min-h-[calc(100vh-11rem)] bg-black/95 overflow-hidden">
          {/* Full screen image skeleton */}
          <Skeleton className="absolute inset-0 bg-gray-900/80" />
          
          {/* Content overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60">
            {/* Author info skeleton - Bottom Left */}
            <div className="absolute bottom-4 left-4 right-16 z-10 flex items-start">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="ml-2 flex-grow">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2 mt-1" />
              </div>
            </div>

            {/* Action buttons skeleton - Right Side */}
            <div className="absolute right-4 bottom-20 flex flex-col items-center gap-6">
              {/* Like button skeleton */}
              <div className="flex flex-col items-center gap-1">
                <Skeleton className="h-10 w-10 rounded-full bg-gray-800/50" />
                <Skeleton className="h-3 w-8" />
              </div>

              {/* Comment button skeleton */}
              <div className="flex flex-col items-center gap-1">
                <Skeleton className="h-10 w-10 rounded-full bg-gray-800/50" />
                <Skeleton className="h-3 w-8" />
              </div>

              {/* Share button skeleton */}
              <div className="flex flex-col items-center gap-1">
                <Skeleton className="h-10 w-10 rounded-full bg-gray-800/50" />
                <Skeleton className="h-3 w-8" />
              </div>

              {/* Save button skeleton */}
              <div className="flex flex-col items-center">
                <Skeleton className="h-10 w-10 rounded-full bg-gray-800/50" />
              </div>
            </div>

            {/* Location tag skeleton - Top Right */}
            <div className="absolute top-4 right-4">
              <Skeleton className="h-6 w-24 rounded-full bg-gray-800/50" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
} 